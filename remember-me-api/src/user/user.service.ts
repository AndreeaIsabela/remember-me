import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(
    name: string,
    email: string,
    password: string,
  ): Promise<UserDocument> {
    const user = new this.userModel({ name, email, password });
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password');
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken });
  }

  async setPasswordResetToken(
    email: string,
  ): Promise<{ user: UserDocument; resetToken: string } | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return { user, resetToken };
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return this.userModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });
  }

  async resetPassword(user: UserDocument, newPassword: string): Promise<void> {
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  }

  async changePassword(
    userId: string,
    newPassword: string,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return null;
    }

    user.password = newPassword;
    await user.save();
    return user;
  }

  async setEmailVerificationToken(
    userId: string,
  ): Promise<{ user: UserDocument; verificationToken: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    return { user, verificationToken };
  }

  async findByEmailVerificationToken(
    token: string,
  ): Promise<UserDocument | null> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    return this.userModel.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });
  }

  async verifyEmail(user: UserDocument): Promise<void> {
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
  }
}

