import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Message } from '@prisma/client';

const DEFAULT_LIMIT = 200;

@Injectable()
export class ChatService {
    constructor(private readonly prisma: PrismaService) {}

    async createMessage(body: string): Promise<Message> {
        const text = body.trim();
        if (!text) {
            throw new BadRequestException('Empty message');
        }
        return await this.prisma.message.create({
            data: { body: text },
        });
    }

    async updateMessage(id: string, patch: { body?: string; pinned?: boolean }): Promise<Message> {
        const existing = await this.prisma.message.findUnique({ where: { id } });
        if (!existing) {
            throw new NotFoundException('Message not found');
        }
        const data: {
            body?: string;
            editedAt?: Date;
            pinned?: boolean;
            pinnedAt?: Date | null;
        } = {};
        if (patch.body !== undefined) {
            const text = patch.body.trim();
            if (!text) {
                throw new BadRequestException('Empty message');
            }
            data.body = text;
            data.editedAt = new Date();
        }
        if (patch.pinned !== undefined) {
            data.pinned = patch.pinned;
            data.pinnedAt = patch.pinned ? new Date() : null;
        }
        if (Object.keys(data).length === 0) {
            return existing;
        }
        return this.prisma.message.update({
            where: { id },
            data,
        });
    }

    async deleteMessage(id: string): Promise<void> {
        const r = await this.prisma.message.deleteMany({ where: { id } });
        if (r.count === 0) {
            throw new NotFoundException('Message not found');
        }
    }

    async bulkDelete(ids: string[]): Promise<number> {
        const unique = [...new Set(ids)].filter(Boolean);
        if (unique.length === 0) {
            return 0;
        }
        const r = await this.prisma.message.deleteMany({
            where: { id: { in: unique } },
        });
        return r.count;
    }

    async findPage(limit: number, beforeId?: string) {
        const take = Math.min(Math.max(limit, 1), 500);
        if (!beforeId) {
            const items = await this.prisma.message.findMany({
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: take + 1,
            });
            const hasMore = items.length > take;
            const page = hasMore ? items.slice(0, take) : items;
            return {
                items: page.map((m: Message) => this.serialize(m)),
                nextCursor: hasMore ? page[page.length - 1].id : null,
                hasMore,
            };
        }
        const cursorMsg = await this.prisma.message.findUnique({
            where: { id: beforeId },
        });
        if (!cursorMsg) {
            throw new NotFoundException('Invalid cursor');
        }
        const items = await this.prisma.message.findMany({
            where: {
                OR: [
                    { createdAt: { lt: cursorMsg.createdAt } },
                    {
                        AND: [{ createdAt: cursorMsg.createdAt }, { id: { lt: cursorMsg.id } }],
                    },
                ],
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: take + 1,
        });
        const hasMore = items.length > take;
        const page = hasMore ? items.slice(0, take) : items;
        return {
            items: page.map((m: Message) => this.serialize(m)),
            nextCursor: hasMore ? page[page.length - 1].id : null,
            hasMore,
        };
    }

    serialize(m: Message) {
        return {
            id: m.id,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            editedAt: m.editedAt?.toISOString() ?? null,
            pinned: m.pinned,
            pinnedAt: m.pinnedAt?.toISOString() ?? null,
        };
    }

    getDefaultLimit() {
        return DEFAULT_LIMIT;
    }
}
