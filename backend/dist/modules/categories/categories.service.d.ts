import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
export declare class CreateCategoryDto {
    subject: string;
    bookName: string;
    chapter: string;
    lesson: string;
    questionNumber?: number;
}
export declare class CategoriesService {
    private categoriesRepo;
    constructor(categoriesRepo: Repository<Category>);
    create(dto: CreateCategoryDto): Promise<Category>;
    findAll(subject?: string): Promise<Category[]>;
    update(id: string, dto: Partial<CreateCategoryDto>): Promise<Category>;
    remove(id: string): Promise<void>;
}
