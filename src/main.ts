import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';
import { getPublicRoot } from './files/upload-path';
import { Color } from './lib/color';
import { getConfiguredAdvertiseHost, getLanIPv4Addresses, getLanIPv6Addresses } from './net-address';

async function bootstrap() {
    loadEnv();
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bodyParser: true,
        rawBody: false,
    });
    app.enableCors({ origin: true });

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5180;
    const host = '0.0.0.0';
    const publicRoot = getPublicRoot();
    // main.js is emitted under dist/src/, so go up to project root before client/dist
    const clientDist = join(__dirname, '..', '..', 'client', 'dist');

    if (existsSync(publicRoot)) {
        app.useStaticAssets(publicRoot, { index: false });
    }

    if (existsSync(join(clientDist, 'index.html'))) {
        app.useStaticAssets(clientDist, { index: false });
        app.use((req: Request, res: Response, next: NextFunction) => {
            if (req.method !== 'GET') {
                return next();
            }
            if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
                return next();
            }
            res.sendFile(join(clientDist, 'index.html'), (err) => {
                if (err) {
                    next(err);
                }
            });
        });
    }

    await app.listen(port, host);

    const displayHost = host === '0.0.0.0' ? 'localhost' : host;
    const localUrl = `http://${displayHost}:${port}`;
    const header =
        Color.green('● ', { bold: true }) +
        Color.white('Server listening ', {}) +
        Color.cyan(localUrl, { bold: true, underline: true }) +
        Color.white(`  (bound on ${host}:${port})`, {});

    console.log('\n\n');
    console.log(header);

    const advertised = getConfiguredAdvertiseHost();
    if (advertised) {
        const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(advertised);
        const publicUrl = hasScheme ? advertised : `http://${advertised}:${port}`;
        console.log(
            Color.white('  Advertised: ', {}) +
                Color.magenta(publicUrl, { bold: true, underline: true }) +
                Color.white('  (PUBLIC_HOST / ADVERTISE_HOST)', {}),
        );
    }

    for (const ip of getLanIPv4Addresses()) {
        const lanUrl = `http://${ip}:${port}`;
        console.log(Color.white('  LAN (IPv4): ', {}) + Color.yellow(lanUrl, { bold: true, underline: true }));
    }
    for (const ip of getLanIPv6Addresses()) {
        const lanUrl = `http://[${ip}]:${port}`;
        console.log(Color.white('  LAN (IPv6): ', {}) + Color.yellow(lanUrl, { bold: true, underline: true }));
    }

    console.log(
        Color.white('  Served URL: ', {}) +
            Color.yellow('https://filemanager.syedamirali.me', { bold: true, underline: true }),
    );
}

bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
