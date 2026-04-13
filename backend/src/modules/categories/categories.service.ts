import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

export class CreateCategoryDto {
  subject: string;
  bookName: string;
  chapter: string;
  lesson: string;
  questionNumber?: number;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesRepo.save(this.categoriesRepo.create(dto));
  }

  async findAll(subject?: string) {
    const qb = this.categoriesRepo.createQueryBuilder('c').orderBy('c.subject').addOrderBy('c.bookName');
    if (subject) qb.where('c.subject ILIKE :subject', { subject: `%${subject}%` });
    return qb.getMany();
  }

  async update(id: string, dto: Partial<CreateCategoryDto>): Promise<Category> {
    await this.categoriesRepo.update(id, dto);
    return this.categoriesRepo.findOne({ where: { id } }) as Promise<Category>;
  }

  async remove(id: string): Promise<void> {
    await this.categoriesRepo.delete(id);
  }
}
