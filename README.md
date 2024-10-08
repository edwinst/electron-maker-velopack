# electron-maker-velopack

This is a maker for Electron Forge that uses *velopack* to build
distribution packages for an application.

For *velopack* docs, see https://docs.velopack.io .

For *Electron Forge* docs, see https://www.electronforge.io .

## Status

This maker is in very early development. It works for my purposes
on Windows, but it is not thoroughly tested. Please consider it
a starting point.

Signing packages, in particular, is untested.

## Supported platforms, prerequisites

The maker requires the command line tool `vpk` to be available on the path
and will fail with a corresponding error message otherwise.

Once you have a .NET SDK installed, you should be able to install the `vpk`
command line tool by running:

    dotnet tool update -g vpk

Note that after the initial installation of the .NET SDK, you may have to
exit and re-enter your command interpreter sessions in order to make addition
of the .NET tools to your PATH variable effective.

The maker will try to run on any platform, but so far it has been tested only
on Windows.

## Usage

First, install `electron-maker-velopack` as a development dependency for your package:

    npm install --save-dev electron-maker-velopack

Then add some code of the following form to your `forgeConfig.js` file under `makers`:

    makers: [
        // ...
        {
            name: 'electron-maker-velopack',
            config: {
                // ... see below for configuration options ...
            },
        },
        // ...

The installer generated by *velopack* will run your application during the install
process in order to create shortcuts for the application, etc.. In order to handle
these setup tasks correctly, install the `velopack` package using

    npm install velopack

in your application package and add the following code to the beginning of your
`main.js` entry point:

    const { VelopackApp } = require('velopack');

    VelopackApp.build().run();

For more details, see the [velopack documentation](https://docs.velopack.io/)
and the [velopack npm package](https://www.npmjs.com/package/velopack).

## Configuration

The maker takes its default configuration from the electron packager configuration
and the `package.json` data, in that order of precedence. You only need to add
specific maker configuration options if you want to override something or you need
an option that is not available in the packager configuration or `package.json`.

Options specified in the maker configuration will always take precedence over
derived defaults.

The maker configuration has the following declaration:

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

### allowInteraction

If true, run `vpk` with stdio handles inherited from the parent process, in order to allow the user to interact with `vpk`.
(For example for confirming the overwriting of an existing release. If this is not given, `vpk` will automatically fail
in such cases.)

Enabling this has the downside that error reporting may be subpar because stdout/stderr output from `vpk` may be swallowed
by the Electron Forge build process in case of an error. If the `vpk` command fails without any visible error message,
try disabling this option.

### channel

The release channel to pass to the `--channel` argument of `vpk`. (Otherwise, `vpk` uses its default channel.)

### delta

The delta generation mode to pass to the `--delta` argument of `vpk`. This can be `"BestSize"`, `"BestSpeed"`, or `"None"`.
(Otherwise, `vpk` defaults to the "BestSpeed" mode.)

Note that delta packages will only be generated if an explicit `outputDir` is given in the maker configuration
(see below) and this directory contains the previous package(s) to compute deltas against.

### exclude

A regex for excluding matching files from the package, to pass to the `--exclude` argument of `vpk`.
(`vpk` defaults to excluding `.*\.pdb`.)

### framework

An array of strings to pass to the `--framework` argument of `vpk`, joined by commas. The strings specify the required runtimes to install during setup.

### icon

The path to an icon file for the installer, to pass to the `--icon` argument of `vpk`.

This defaults to the icon specified in the packager configuration, if any.

### noInstaller

If true, do not build the executable installer. (`--noInst` argument to `vpk`.)

### noPortable

If true, do not build the portable installer. (`--noPortable` argument to `vpk`.)

### outputDir

The directory into which `vpk` should put the newly built packages, to pass to the `--outputDir` argument of `vpk`.

If this is not given, an empty directory will be created as `velopack/${targetPlatform}/${targetArch}`
under the Electron Forge `out/make` directory and passed to `vpk` as the `--outputDir`.
In this case, the `delta` configuration option has no effect since `vpk` will not find any previously built packages
in this directory.

If this option is specified, the given directory will *not* be cleared. Existing files will be kept in order to
allow `pkg` to built delta packages with respect to earlier versions.

### packAuthors

The authors string to pass to the `--packAuthors` argument of `vpk`. Defaults to author information pulled
from the `package.json` data.

### packId

The package id string to pass to the `--packId` argument of `vpk`. This must be a valid nupkg ID (containing
only alphanumeric characters, underscores, dashes, and dots). Defaults to `name` in the packager configuration
or the app name, with characters not valid in nupkg IDs replaced by underscores.

This value is used for the `<id>` of the generated nupkg.

### packTitle

A human-friendly name of the applicaton to pass to the `--packTitle` argument of `vpk`. Defaults
to `packagerConfig.name`, or `productName` from `package.json`, or the app name.

This value is used for both the `<title>` and the `<description>` of the generated nupkg.

### packVersion

The version string to pass to the `--packVersion` argument of `vpk`. Defaults to a conversion of
`appVersion` in the packager configuration, or of the `version` given in `package.json`.

Note: The conversion of the semantic package version is done to put it in a form compatible
with the nupkg version format. If you specify `packVersion`, its value is used literally, without
automatic conversion.

See [Semantic Versioning specification](https://semver.org/)

See [NuGet versioning specification](https://learn.microsoft.com/en-us/nuget/concepts/package-versioning?tabs=semver20sort)

### releaseNotes

Path to a file with release notes, to pass to the `--releaseNotes` argument of `vpk`.

### runtime

A string specifying the target runtime to build packages for, to pass to the `--runtime` argument of `vpk`.

### shortcuts

An array of strings specifying which shortcuts the installer should create. The values are passed
to the `--shortcuts` argument of `vpk`, separated by commas.

To create a shortcut in the top-level of the start menu, include `"StartMenuRoot"`.

To create a Desktop shortcut, include `"Desktop"`.

### signParallel

The number of files to sign in parallel, to pass to the `--signParallel` argument of `vpk`. (`vpk` defaults to `10`.)

### signParams

A single string containing the arguments for signing files, to pass to the `--signParams` argument of `vpk`.

Specifying this option makes `vpk` invoke `signtool.exe` with the `sign` command followed by the given arguments.
Therefore, the value of this option should be the command line to use for `signtool.exe`, omitting `signtool.exe`
itself and the `sign` command.

### signSkipDll

If true, pass the `--signSkipDll` argument to `vpk`, so it only signs EXE files and skips DLLs.

### signTemplate

A string giving a custom command to use for signing, to pass to the `--signTemplate` arugment of `vpk`.

Within this string, `vpk` will replace `{{file}}` with the path of the file to be signed.

### skipVeloAppCheck

If true, pass the `--skipVeloAppCheck` to `vpk`, so it skips the VelopackApp builder verification.

### splashImage

The path of a splash image to show during installation, to pass to the `--splashImage` argument of `vpk`.

### vpkExtraArguments

An array of extra arguments to append to the invokation of the velopack command line tool.
(These arguments are not added when the maker is checking whether the command line tool is available.)

### vpkProgram

The velopack command line tool to run. Defaults to `vpk`, which is expected to be in `PATH`.

The maker will execute the given program first with only the `--help` argument, in order
to check whether the program is available.

## Limitations and Known Bugs

### Return value of the `make` method

The maker currently only returns the path of the `RELEASES` file as a generated artifact.

This is mostly because I am not yet sure how to handle pre-existing files in `outputDir`
and delta package generation with respect to the returned artifact paths.

## License

This package is published under the MIT license. See the file `LICENSE` for details.

