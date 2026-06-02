import fs from 'fs';

// 1. Read the newly bumped version from package.json
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

// 2. Read Cargo.toml
let cargo = fs.readFileSync('./src-tauri/Cargo.toml', 'utf-8');

// 3. Find and replace the version line under [package]
cargo = cargo.replace(/^version\s*=\s*"[^"]*"/m, `version = "${pkg.version}"`);

// 4. Write it back out
fs.writeFileSync('./src-tauri/Cargo.toml', cargo);
console.log(`Successfully synced Cargo.toml to version v${pkg.version}`);