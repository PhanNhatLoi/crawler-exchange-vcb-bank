import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('hello')
@Controller('hello')
export class HelloController {
  @Get()
  @ApiOkResponse({
    description: 'Returns a simple hello world message.',
    schema: {
      example: {
        message: 'hello world',
      },
    },
  })
  getHello() {
    return {
      message: 'hello world',
    };
  }
}
