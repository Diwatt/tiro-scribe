#!/usr/bin/perl
# Patches @mikro-orm/core and @mikro-orm/sql for Metro/Hermes (React Native).
# Run against the temp dir created by `pnpm patch <pkg>@<version>`, then
# `pnpm patch-commit <dir>`. Idempotent; skips files not present in the package.
# See TODO.md R9.
use strict;
use warnings;

my $dir = $ARGV[0] or die "usage: patch-mikroorm.pl <patched-pkg-dir>\n";

sub slurp {
    my ($f) = @_;
    open my $h, '<:raw', $f or die "open $f: $!";
    local $/;
    my $c = <$h>;
    close $h;
    return $c;
}

sub spew {
    my ($f, $c) = @_;
    open my $h, '>:raw', $f or die "write $f: $!";
    print $h $c;
    close $h;
}

sub patch_file {
    my ($path, $hunks) = @_;
    if (!-f $path) {
        print "skipped (not in this package): $path\n";
        return;
    }

    my $c = slurp($path);
    for my $h (@$hunks) {
        my ($old, $new, $label) = @$h;
        if (index($c, $new) >= 0) {
            print "already patched: $label\n";
            next;
        }

        my $i = index($c, $old);
        die "NOT FOUND ($label) in $path — file layout changed, regenerate this patch\n" if $i < 0;
        substr($c, $i, length($old)) = $new;
        print "patched: $label\n";
    }
    spew($path, $c);
}

patch_file("$dir/utils/Utils.js", [
    ["            return await import(module);",
     "            // [tiro-scribe patch] Metro/Hermes rejects import(<variable>) at transform time.\n            return require(module);",
     "Utils.js tryImport"],
]);

patch_file("$dir/MikroORM.js", [
    ["    try {\n        const url = import.meta.resolve(pkg);\n        const mod = await import(url);\n        if (mod[name]) {\n            extensions.push(mod[name]);\n        }\n    }\n    catch {\n        // not installed\n    }",
     "    // [tiro-scribe patch] Node-only extension discovery (import.meta.resolve + dynamic\n    // import) is not supported under Metro/Hermes. The RN app registers no extensions.\n    return;",
     "MikroORM.js tryRegisterExtension"],
    ["    await import('\@mikro-orm/core/fs-utils').then(m => m.fs.init()).catch(() => null);\n",
     "    // [tiro-scribe patch] fs-utils requires node:fs — not available under Metro/Hermes.\n",
     "MikroORM.js fs.init"],
    ["        options.metadataCache.adapter ??= await import('\@mikro-orm/core/fs-utils').then(m => m.FileCacheAdapter);",
     "        throw new Error('metadataCache is not supported under Metro/Hermes (fs-utils requires node:fs)');",
     "MikroORM.js metadataCache"],
]);

patch_file("$dir/utils/DataloaderUtils.js", [
    ["            const mod = await import('dataloader');",
     "            // [tiro-scribe patch] optional peer `dataloader` is not installed in the RN app.\n            throw new Error('dataloader is not available under Metro/Hermes');",
     "DataloaderUtils.js getDataLoader"],
]);

patch_file("$dir/utils/Configuration.js", [
    ["    dynamicImportProvider: /* v8 ignore next */ (id) => import(id),",
     "    dynamicImportProvider: /* [tiro-scribe patch] */ (id) => { throw new Error('dynamic imports are not supported under Metro/Hermes'); },",
     "Configuration.js dynamicImportProvider"],
]);

patch_file("$dir/metadata/MetadataDiscovery.js", [
    ["            const { discoverEntities } = await import('\@mikro-orm/core/file-discovery');",
     "            // [tiro-scribe patch] folder-based discovery is Node-only (node:fs) — the RN app passes entity classes.\n            throw new Error('folder-based entity discovery is not supported under Metro/Hermes');",
     "MetadataDiscovery.js file-discovery"],
]);

patch_file("$dir/dialects/sqlite/BaseSqliteConnection.js", [
    ["        const { fs } = await import('\@mikro-orm/core/fs-utils');",
     "        // [tiro-scribe patch] attached databases need fs-utils (node:fs) — never configured in the RN app.\n        throw new Error('attachDatabases is not supported under Metro/Hermes');",
     "BaseSqliteConnection.js fs-utils"],
]);

print "OK: patch complete\n";
