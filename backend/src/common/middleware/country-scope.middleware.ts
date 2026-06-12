import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CountryScopeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract country_code from user context, header, or default
    const countryCode =
      (req as any).user?.countryCode ||
      req.headers['x-country-code'] ||
      'CM';

    (req as any).countryCode = countryCode;
    next();
  }
}
