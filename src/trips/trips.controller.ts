import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto } from './dto/trip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private tripsService: TripsService) {}

  @Post()
  async create(@GetUser() user: User, @Body() createTripDto: CreateTripDto) {
    return this.tripsService.create(user.id, createTripDto);
  }

  @Get()
  async findAll() {
    return this.tripsService.findAll();
  }

  @Get('my-trips')
  async findMyTrips(@GetUser() user: User) {
    return this.tripsService.findByUser(user.id);
  }

  @Post('matching')
  async findMatchingTrips(
    @GetUser() user: User,
    @Body() body: { destination: string; startDate: string; endDate: string },
  ) {
    return this.tripsService.findMatchingTrips(
      body.destination,
      new Date(body.startDate),
      new Date(body.endDate),
      user.id,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tripsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() updateTripDto: UpdateTripDto,
  ) {
    return this.tripsService.update(id, user.id, updateTripDto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    await this.tripsService.delete(id, user.id);
    return { message: 'Trip deleted successfully' };
  }
}

