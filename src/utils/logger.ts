import winston from 'winston';
import { Plugin } from 'obsidian';

class PluginLogger {
    private static instance: PluginLogger;
    private logger: winston.Logger;
    private logIndex: number = 0;
    private plugin: Plugin | null = null;

    private constructor() {
        this.logger = this.initializeLogger();
    }

    public static getInstance(): PluginLogger {
        if (!PluginLogger.instance) {
            PluginLogger.instance = new PluginLogger();
        }
        return PluginLogger.instance;
    }

    private initializeLogger(): winston.Logger {
        const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
            this.logIndex++;
            return `[${this.logIndex}] [${timestamp}] [${level}]: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''}`;
        });

        return winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                customFormat
            ),
            transports: [
                new winston.transports.Console(),
            ],
        });
    }

    public setPlugin(plugin: Plugin) {
        this.plugin = plugin;
    }

    private async setupFileTransports() {
        if (!this.plugin) {
            console.warn('Plugin not set, file transports not added');
            return;
        }

        const logDir = `${this.plugin.app.vault.configDir}/plugins/${this.plugin.manifest.id}/logs`;
        try {
            await this.plugin.app.vault.adapter.mkdir(logDir);
            
            const errorLogPath = `${logDir}/error.log`;
            const combinedLogPath = `${logDir}/combined.log`;

            this.logger.add(new winston.transports.File({ filename: errorLogPath, level: 'error' }));
            this.logger.add(new winston.transports.File({ filename: combinedLogPath }));

            this.info('File transports added successfully', { logDir });
        } catch (error) {
            console.error('Failed to set up file transports', error);
        }
    }

    public log(level: string, message: string, metadata: object = {}) {
        this.logger.log(level, message, metadata);
    }

    public info(message: string, metadata: object = {}) {
        this.logger.info(message, metadata);
    }

    public warn(message: string, metadata: object = {}) {
        this.logger.warn(message, metadata);
    }

    public error(message: string, metadata: object = {}) {
        this.logger.error(message, metadata);
    }
}

export const logger = PluginLogger.getInstance();