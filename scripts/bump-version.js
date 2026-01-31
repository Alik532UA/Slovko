import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

try {
    console.log('🔄 Auto-incrementing version...');

    // 1. Run npm version patch
    // --no-git-tag-version: updates package.json and package-lock.json without creating a commit/tag
    // --force: allows running even if the working directory is not clean (which it isn't, during a commit)
    execSync('npm version patch --no-git-tag-version --force', { stdio: 'inherit' });

    // 2. Read the new version
    const packageJsonPath = path.resolve('package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const newVersion = packageJson.version;

    // 3. Update static/version.json
    const staticVersionPath = path.resolve('static/version.json');
    const staticVersionData = { version: newVersion };
    fs.writeFileSync(staticVersionPath, JSON.stringify(staticVersionData, null, 4));

    // 4. Stage the changed files so they are included in the current commit
    execSync('git add package.json package-lock.json static/version.json', { stdio: 'inherit' });

    console.log(`✅ Version bumped to ${newVersion}`);
} catch (error) {
    console.error('❌ Failed to bump version:', error);
    process.exit(1); // Block the commit if version bump fails
}
