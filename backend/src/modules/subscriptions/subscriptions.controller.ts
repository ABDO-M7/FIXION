import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlan } from './entities/subscription.entity';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('redeem')
  @Roles(UserRole.STUDENT)
  redeem(@Body('code') code: string, @CurrentUser() user: any) {
    return this.subscriptionsService.redeemCode(code, user);
  }

  @Get('status')
  @Roles(UserRole.STUDENT)
  getStatus(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getStatus(userId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  getAll(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.subscriptionsService.getAllSubscriptions(+page, +limit);
  }
}

@Controller('codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CodesController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('generate')
  @Roles(UserRole.ADMIN)
  generate(
    @Body('plan') plan: SubscriptionPlan,
    @Body('quantity') quantity: number,
    @Body('expiresAt') expiresAt: string,
    @CurrentUser() admin: any,
  ) {
    return this.subscriptionsService.generateCodes(
      plan,
      quantity,
      admin,
      expiresAt ? new Date(expiresAt) : undefined,
    );
  }

  @Get()
  @Roles(UserRole.ADMIN)
  listCodes(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('isUsed') isUsed?: string,
  ) {
    const used = isUsed === undefined ? undefined : isUsed === 'true';
    return this.subscriptionsService.listCodes(+page, +limit, used);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  revoke(@Param('id') id: string) {
    return this.subscriptionsService.revokeCode(id);
  }
}
