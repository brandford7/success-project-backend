import { Controller, Get, Head } from '@nestjs/common';

@Controller('health') // This makes the route /api/health (due to your 'api' prefix)
export class HealthController {
  @Head() // Handles the 'Cannot HEAD /api/health' error
  @Get() // Handles the 'GET /api/health' request
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
