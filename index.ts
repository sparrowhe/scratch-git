import fs from 'fs';
import jszip from 'jszip';
import chalk from 'chalk';
import { Command } from 'commander';
import { execSync } from 'child_process';
import { confirm } from '@inquirer/prompts';

const program = new Command();

// 解压zip, 将project.json放入项目根目录，其他文件放入assets目录
const unzip = async (zipPath: string) => {
    const zip = new jszip();
    const data = fs.readFileSync(zipPath);
    const zipData = await zip.loadAsync(data);
    if (!fs.existsSync('./assets')) {
        fs.mkdirSync('./assets');
    }
    zipData.forEach(async (path, file) => {
        if (path === 'project.json') {
            const content = await file.async('string');
            const jsObject = JSON.parse(content);
            const formatted = JSON.stringify(jsObject, null, 4);
            fs.writeFileSync('./project.json', formatted);
        } else {
            const content = await file.async('nodebuffer');            
            fs.writeFileSync(`./assets/${path}`, content);
        }
    });
}

const pack = async () => {
    const zip = new jszip();
    zip.file('project.json', fs.readFileSync('./project.json'));
    fs.readdirSync('./assets').forEach((file) => {
        zip.file(file, fs.readFileSync(`./assets/${file}`));
    });
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync('./project.sb3', content);
}

const init = async () => {
    let initGit = true;
    let useLFS = true;
    initGit = await confirm({
        message: 'Initialize a Git repository?',
        default: true
    });
    if (initGit) {
        useLFS = await confirm({
            message: 'Initialize Git LFS?',
            default: true
        });
    }
    if (!fs.existsSync('.git') && initGit) {
        console.log('Initialize Git');
        execSync('git init');
    }
    if (useLFS) {
        console.log('Initialize Git LFS');
        try {
            execSync('git lfs install');
        } catch (e) {
            console.log(chalk.red('Git LFS not installed, please see https://github.com/git-lfs/git-lfs for installation instructions'));
            return
        }
        fs.writeFileSync('.gitattributes', 'assets/* filter=lfs diff=lfs merge=lfs -text');
    }
    console.log(chalk.green('Project initialized'));
}

program
    .command('init')
    .description('initialize a project')
    .action(init);

program
    .command('extract')
    .description('extract sb3 to project.json and assets')
    .action(() => unzip("./project.sb3"));

program
    .command('pack')
    .description('pack you project to sb3')
    .action(pack);

program.parse();