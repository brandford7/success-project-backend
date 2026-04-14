import { Controller, Get, Head } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Head()
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
