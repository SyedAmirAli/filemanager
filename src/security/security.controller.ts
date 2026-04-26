import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { isSecurityPinValid } from './security-pin';

@Controller('api/security')
export class SecurityController {
  @Post('pin/verify')
  @HttpCode(200)
  verifyPin(@Body() body: { pin?: string }) {
    const pin = typeof body?.pin === 'string' ? body.pin : '';
    return { ok: isSecurityPinValid(pin) };
  }
}
