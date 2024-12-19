import { MakerBase, MakerOptions } from '@electron-forge/maker-base';
import { ForgePlatform } from '@electron-forge/shared-types';
import path from 'path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { hasUncaughtExceptionCaptureCallback } from 'node:process';

const hasProp = <K extends PropertyKey, T>(obj: T, prop: K): obj is T & Record<K, unknown> => {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}


export type MakerVelopackConfig = {
    allowInteraction?: boolean,
    channel?: string,
    delta?: string,
    exclude?: string,
    framework?: string[],
    icon?: string,
    noInstaller?: boolean,
    noPortable?: boolean,
    outputDir?: string,
    packAuthors?: string,
    packId?: string,
    packTitle?: string,
    packVersion?: string,
    releaseNotes?: string,
    runtime?: string,
    shortcuts?: string[],
    signParallel?: number,
    signParams?: string,
    signSkipDll?: boolean,
    signTemplate?: string,
    skipVeloAppCheck?: boolean,
    splashImage?: string,
    vpkExtraArguments?: string[],
    vpkProgram?: string,
};

const default_vpk_program = "vpk";

// --- BEGIN code from electron-winstaller ----------------------

// The following code (up to the END marker below) is from the
// electron-winstaller package and has the following copyright notice:
//
//     Copyright (c) 2015 GitHub Inc.

/**
 * A utility function to convert SemVer version strings into NuGet-compatible
 * version strings.
 * @param version A SemVer version string
 * @returns A NuGet-compatible version string
 * @see {@link https://semver.org/ | Semantic Versioning specification}
 * @see {@link https://learn.microsoft.com/en-us/nuget/concepts/package-versioning?tabs=semver20sort | NuGet versioning specification}
 */
function convertVersion(version: string): string {
    const parts = version.split('+')[0].split('-');
    const mainVersion = parts.shift();

    if (parts.length > 0) {
        return [mainVersion, parts.join('-').replace(/\./g, '')].join('-');
    } else {
        return mainVersion as string;
    }
}

// --- END of code from electron-winstaller ---------------------

function convertNameToNupkgId(name: string): string  {
    return name.replace(/[^-A-Za-z0-9_.]/g, "_");
}

function assembleCommandLineForDisplay(program: string, args: string[]): string {
    const maybe_quoted_args = args.map(arg => arg.match(/\s/) ? '"' + arg + '"' : arg);
    return [program, ...maybe_quoted_args].join(" ");
}

export default class MakerVelopack extends MakerBase<MakerVelopackConfig> {
    name = 'velopack';

    defaultPlatforms: ForgePlatform[] = ['win32'];

    isSupportedOnCurrentPlatform(): boolean {
        return true;
    }

    checkVpkProgramAvailable(): void {
        // Note: We cannot do this in `isSupportedOnCurrentPlatform` because this.config is not
        //       yet set when that method is called.
        //
        const vpk_program = this.getVpkProgram();
        const vpk_args = ["--help"];
        const vpk_check_command = assembleCommandLineForDisplay(vpk_program, vpk_args);
        try {
            // we 'ignore' stdout to hide normal output; stderr remains visible to the user
            execFileSync(vpk_program, vpk_args, { stdio: ['inherit', 'ignore', 'inherit'] });
        }
        catch (error) {
            console.error(error);
            throw new Error(`

electron-maker-velopack: The required command line tool '${vpk_program}' does not seem to be available.
(Failed to run command '${vpk_check_command}'.)

You can install 'vpk' by running:

    dotnet tool update -g vpk

This requires a .NET SDK to be installed and the .NET SDK tools to be available in PATH.
(You may need to re-enter the command interpreter session after installing the .NET SDK
to make changes in PATH effective.)

`);
        }
    }

    async make({ appName, dir, makeDir, targetPlatform, targetArch, packageJSON, forgeConfig }: MakerOptions): Promise<string[]> {
        this.checkVpkProgramAvailable();

        let outPath = this.config.outputDir;
        if (outPath == null) {
             outPath = path.resolve(makeDir, `velopack/${targetPlatform}/${targetArch}`);
             await this.ensureDirectory(outPath);
        }
        else {
            outPath = path.resolve(outPath);
        }

        const exe_extension = targetPlatform === "win32" ? ".exe" : "";
        const exe_name = `${forgeConfig.packagerConfig.executableName || appName}${exe_extension}`;
        const exe_path = path.join(dir, exe_name);

        try {
            await fs.promises.access(exe_path);
        }
        catch (error) {
            throw new Error(`The executable file to package does not exist at the expected path: ${exe_path}.\n${error}`);
        }

        // we don't check forgeConfig.packagerConfig.appBundleId, as I think that is MacOS-specific
        const packid_name = forgeConfig.packagerConfig.name ?? appName;
        const pack_id = this.config.packId ?? convertNameToNupkgId(packid_name);

        const _version = forgeConfig.packagerConfig.appVersion ?? packageJSON.version;
        const version = this.config.packVersion ?? convertVersion(_version);
        const title = this.config.packTitle ?? forgeConfig.packagerConfig.name ?? packageJSON.productName ?? appName;
        const icon = this.config.icon ?? forgeConfig.packagerConfig.icon;

        let authors = this.config.packAuthors ?? packageJSON.authors ?? "";
        if (!authors && packageJSON.author) {
            authors = packageJSON.author;
            if (typeof authors !== "string")
                authors = packageJSON.author.name;
        }

        const vpk_program = this.getVpkProgram();

        const vpk_args: string[] = ["pack",
                          "--packId", pack_id,
                          "--packVersion", version,
                          "--packDir", dir,
                          "--mainExe", exe_name,
                          "--outputDir", outPath,
                         ];

        if (this.config.channel != null)
            vpk_args.push("--channel", this.config.channel);

        if (this.config.delta != null)
            vpk_args.push("--delta", this.config.delta);

        if (this.config.exclude != null)
            vpk_args.push("--exclude", this.config.exclude);

        if (this.config.framework)
            vpk_args.push("--framework", this.config.framework.join(","));

        if (icon != null)
            vpk_args.push("--icon", icon);

        if (this.config.noInstaller)
            vpk_args.push("--noInst");

        if (this.config.noPortable)
            vpk_args.push("--noPortable");

        if (authors != null)
            vpk_args.push("--packAuthors", authors);

        if (title != null)
            vpk_args.push("--packTitle", title);

        if (this.config.releaseNotes != null)
            vpk_args.push("--releaseNotes", this.config.releaseNotes);

        if (this.config.runtime != null)
            vpk_args.push("--runtime", this.config.runtime);

        if (this.config.shortcuts)
            vpk_args.push("--shortcuts", this.config.shortcuts.join(","));

        if (this.config.signSkipDll)
            vpk_args.push("--signSkipDll");

        if (this.config.signParallel != null)
            vpk_args.push("--signParallel", this.config.signParallel.toFixed(0));

        // Note: For the sign options, we could try to get defaults from `windowsSign` or `osxSign` in packagerConfig.
        //       We don't currently do that.

        if (this.config.signParams != null)
            vpk_args.push("--signParams", this.config.signParams);

        if (this.config.signTemplate != null)
            vpk_args.push("--signTemplate", this.config.signTemplate);

        if (this.config.skipVeloAppCheck)
            vpk_args.push("--skipVeloAppCheck");

        if (this.config.splashImage != null)
            vpk_args.push("--splashImage", this.config.splashImage);

        if (this.config.vpkExtraArguments)
            vpk_args.push(...this.config.vpkExtraArguments);

        const vpk_command = assembleCommandLineForDisplay(vpk_program, vpk_args);

        try {
            // If interaction is wanted, inherit stdio to allow interactive input/output of vpk.
            // That is also why we have to use the ...Sync function here.
            execFileSync(vpk_program, vpk_args, { stdio: this.config.allowInteraction ? "inherit" : "pipe" });
        }
        catch (error) {
            if (error == null)
                throw new Error(`Could not create velopack package.\nFailed command: ${vpk_command}\n\n`);
            if (typeof error === "object") {
                const stdout =  hasProp(error, "stdout") ? "\n\n"+error.stdout : "";
                const stderr =  hasProp(error, "stderr") ? "\n\n"+error.stderr : "";
                const message = (error instanceof Error) ? "\n\n"+error.message : "";
                throw new Error(`Could not create velopack package.\nFailed command: ${vpk_command}${message}${stdout}${stderr}\n`);
            }
            throw new Error(`Could not create velopack package.\nFailed command: ${vpk_command}\n\n${error}\n`);
        }

        const artifacts = [
            path.resolve(outPath, 'RELEASES'),
        ];
        return artifacts;
    }

    getVpkProgram(): string {
        return this.config.vpkProgram ?? default_vpk_program;
    }
}

export { MakerVelopack };
