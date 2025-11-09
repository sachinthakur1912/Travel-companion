import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      isEmailVerified: false,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;

    return {
      ...result,
      access_token: this.jwtService.sign({ sub: savedUser.id }),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password, ...result } = user;

    return {
      ...result,
      access_token: this.jwtService.sign({ sub: user.id }),
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async googleLogin(user: any) {
    let existingUser = await this.userRepository.findOne({
      where: { email: user.email },
    });

    if (existingUser) {
      if (!existingUser.googleId) {
        existingUser.googleId = user.googleId;
        existingUser.profilePhoto = user.profilePhoto;
        await this.userRepository.save(existingUser);
      }
    } else {
      existingUser = this.userRepository.create({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePhoto: user.profilePhoto,
        googleId: user.googleId,
        isEmailVerified: true,
      });
      existingUser = await this.userRepository.save(existingUser);
    }

    const { password, ...result } = existingUser;

    return {
      ...result,
      access_token: this.jwtService.sign({ sub: existingUser.id }),
    };
  }
}

