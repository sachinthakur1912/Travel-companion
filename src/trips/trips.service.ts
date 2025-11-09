import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { CreateTripDto, UpdateTripDto } from './dto/trip.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
  ) {}

  async create(userId: string, createTripDto: CreateTripDto): Promise<Trip> {
    const trip = this.tripRepository.create({
      ...createTripDto,
      userId,
      startDate: new Date(createTripDto.startDate),
      endDate: new Date(createTripDto.endDate),
    });
    return this.tripRepository.save(trip);
  }

  async findAll(): Promise<Trip[]> {
    return this.tripRepository.find({
      relations: ['user'],
      where: { isActive: true },
    });
  }

  async findMatchingTrips(
    destination: string,
    startDate: Date,
    endDate: Date,
    excludeUserId: string,
  ): Promise<Trip[]> {
    // Find trips with overlapping date ranges and same destination
    return this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.user', 'user')
      .where('trip.destination = :destination', { destination })
      .andWhere('trip.isActive = :isActive', { isActive: true })
      .andWhere('trip.userId != :excludeUserId', { excludeUserId })
      .andWhere(
        '(trip.startDate <= :endDate AND trip.endDate >= :startDate)',
        { startDate, endDate },
      )
      .getMany();
  }

  async findByUser(userId: string): Promise<Trip[]> {
    return this.tripRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async update(
    id: string,
    userId: string,
    updateTripDto: UpdateTripDto,
  ): Promise<Trip> {
    const trip = await this.findOne(id);

    if (trip.userId !== userId) {
      throw new ForbiddenException('You can only update your own trips');
    }

    if (updateTripDto.startDate) {
      trip.startDate = new Date(updateTripDto.startDate);
    }
    if (updateTripDto.endDate) {
      trip.endDate = new Date(updateTripDto.endDate);
    }

    Object.assign(trip, updateTripDto);
    return this.tripRepository.save(trip);
  }

  async delete(id: string, userId: string): Promise<void> {
    const trip = await this.findOne(id);

    if (trip.userId !== userId) {
      throw new ForbiddenException('You can only delete your own trips');
    }

    await this.tripRepository.remove(trip);
  }
}

