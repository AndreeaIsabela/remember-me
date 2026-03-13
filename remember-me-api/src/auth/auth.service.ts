import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('google.clientId'),
    );
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.userService.create(name, email, password);

    // Generate and send verification email
    const { verificationToken } =
      await this.userService.setEmailVerificationToken(user.id);
    await this.emailService.sendEmailVerificationEmail(
      user.email,
      verificationToken,
      user.name,
    );

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        authProviders: user.authProviders ?? ['local'],
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.userService.findById(payload.sub);
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user.id, user.email);
      await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.userService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const result = await this.userService.setPasswordResetToken(email);

    // Always return success to prevent email enumeration
    if (!result) {
      return {
        message:
          'If an account with that email exists, a password reset link has been sent',
      };
    }

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(
      result.user.email,
      result.resetToken,
      result.user.name,
    );

    return {
      message:
        'If an account with that email exists, a password reset link has been sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.userService.resetPassword(user, newPassword);
    return { message: 'Password has been reset successfully' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const userWithPassword =
      await this.userService.findByEmailWithPassword(user.email);
    if (!userWithPassword) {
      throw new UnauthorizedException('User not found');
    }

    if (!userWithPassword.password) {
      throw new BadRequestException(
        'No password set on this account. Use Forgot Password to create one.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      userWithPassword.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.userService.changePassword(userId, newPassword);
    return { message: 'Password changed successfully' };
  }

  async confirmEmail(token: string) {
    const user = await this.userService.findByEmailVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userService.verifyEmail(user);
    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.userService.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return {
        message:
          'If an unverified account with that email exists, a verification link has been sent',
      };
    }

    const { verificationToken } =
      await this.userService.setEmailVerificationToken(user.id);
    await this.emailService.sendEmailVerificationEmail(
      user.email,
      verificationToken,
      user.name,
    );

    return {
      message:
        'If an unverified account with that email exists, a verification link has been sent',
    };
  }

  async googleLogin(idToken: string) {
    const clientId = this.configService.get<string>('google.clientId');
    const iosClientId = this.configService.get<string>('google.iosClientId');
    const audience = [clientId, iosClientId].filter(Boolean) as string[];

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email || !payload?.sub) {
      throw new UnauthorizedException('Google token missing required fields');
    }

    const user = await this.userService.findOrCreateGoogleUser(
      payload.sub,
      payload.email,
      payload.name ?? payload.email,
    );

    const tokens = await this.generateTokens(user.id, user.email);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        authProviders: user.authProviders,
      },
      ...tokens,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}

