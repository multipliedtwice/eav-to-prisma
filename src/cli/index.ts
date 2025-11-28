#!/usr/bin/env node

import { Command } from 'commander';
import { Generator } from '../core/generator';
import { loadConfig } from './config-loader';
import { createPrismaClient } from './prisma-loader';
import ora from 'ora';
import chalk from 'chalk';
import prompts from 'prompts';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Read package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  await fs.readFile(join(__dirname, '../../package.json'), 'utf-8')
);

const program = new Command();

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version);

/**
 * Generate schema from EAV database
 */
program
  .command('generate')
  .description('Generate Prisma schema from EAV database')
  .option('-c, --config <path>', 'Path to config file', 'eav-to-prisma.config.ts')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();

    try {
      // Load config
      const config = await loadConfig(options.config);
      spinner.succeed('Configuration loaded');

      // Connect to database only if not using direct input
      let prisma;
      if (!config.input && config.connection) {
        spinner.start('Connecting to database...');
        prisma = await createPrismaClient(config.connection);
        spinner.succeed('Connected to database');
      } else if (!config.input) {
        spinner.fail('No input source configured');
        console.error('\n' + chalk.red('Error: Must provide either input or connection in config'));
        process.exit(1);
      }

      // Generate schema
      spinner.start('Generating Prisma schema...');
      const generator = new Generator(config, prisma);
      const result = await generator.generate();
      spinner.succeed('Schema generated');

      // Write to file
      spinner.start('Writing schema to file...');
      await generator.write();
      const schemaPath = config.output?.schemaPath || './prisma/schema.prisma';
      spinner.succeed(`Schema written to ${schemaPath}`);

      // Show summary
      console.log('\n' + chalk.bold('Summary:'));
      console.log(chalk.green(`✓ Generated ${result.componentsGenerated.length} models`));
      
      if (result.warnings.length > 0) {
        console.log('\n' + chalk.yellow('Warnings:'));
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`  ⚠ ${warning}`));
        });
      }

      console.log('\n' + chalk.bold('Next steps:'));
      const schemaPathForSteps = config.output?.schemaPath || './prisma/schema.prisma';
      console.log(`  1. Review generated schema at ${chalk.cyan(schemaPathForSteps)}`);
      console.log(`  2. Run ${chalk.cyan('npx prisma generate')} to generate Prisma Client`);
      console.log(`  3. Use the generated client in your application`);

      if (prisma) {
        await prisma.$disconnect();
      }
      process.exit(0);
    } catch (error) {
      spinner.fail('Generation failed');
      console.error('\n' + chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

/**
 * Initialize config file
 */
program
  .command('init')
  .description('Create a new configuration file')
  .action(async () => {
    console.log(chalk.bold('Create eav-to-prisma configuration\n'));

    const response = await prompts([
      {
        type: 'text',
        name: 'connection',
        message: 'Database connection string:',
        initial: 'file:./data.db'
      },
      {
        type: 'text',
        name: 'modelTable',
        message: 'Table name for model definitions:',
        initial: 'content_model'
      },
      {
        type: 'text',
        name: 'outputPath',
        message: 'Output path for generated schema:',
        initial: './prisma/content.prisma'
      },
      {
        type: 'confirm',
        name: 'i18nEnabled',
        message: 'Enable i18n (translations)?',
        initial: true
      },
      {
        type: (prev) => prev ? 'text' : null,
        name: 'defaultLang',
        message: 'Default language:',
        initial: 'en'
      },
      {
        type: 'select',
        name: 'convention',
        message: 'Naming convention:',
        choices: [
          { title: 'PascalCase', value: 'PascalCase' },
          { title: 'camelCase', value: 'camelCase' },
          { title: 'snake_case', value: 'snake_case' }
        ],
        initial: 0
      }
    ]);

    const configContent = `import { defineConfig } from 'eav-to-prisma';

export default defineConfig({
  connection: '${response.connection}',
  
  tables: {
    models: '${response.modelTable}'
  },
  
  output: {
    schemaPath: '${response.outputPath}'
  },
  
  i18n: {
    enabled: ${response.i18nEnabled},
    defaultLang: '${response.defaultLang || 'en'}',
    tableNaming: '\${identifier}_translation'
  },
  
  naming: {
    convention: '${response.convention}'
  }
});
`;

    const configPath = 'eav-to-prisma.config.ts';
    await fs.writeFile(configPath, configContent, 'utf-8');

    console.log('\n' + chalk.green('✓ Configuration file created: ') + configPath);
    console.log('\nNext steps:');
    console.log(`  1. Review and adjust ${chalk.cyan(configPath)}`);
    console.log(`  2. Run ${chalk.cyan('npx eav-to-prisma generate')}`);
  });

program.parse();