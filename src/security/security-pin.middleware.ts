import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { isSecurityPinValid, SECURITY_PIN_HEADER } from './security-pin';

@Injectable()
export class SecurityPinMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const rawPin = req.header(SECURITY_PIN_HEADER) ?? '';
    if (!isSecurityPinValid(rawPin)) {
      throw new UnauthorizedException('Invalid or missing security pin');
    }

    next();
  }
}
