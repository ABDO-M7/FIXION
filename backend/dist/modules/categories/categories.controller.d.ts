import { CategoriesService, CreateCategoryDto } from './categories.service';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(subject?: string): Promise<import("./entities/category.entity").Category[]>;
    create(dto: CreateCategoryDto): Promise<import("./entities/category.entity").Category>;
    update(id: string, dto: Partial<CreateCategoryDto>): Promise<import("./entities/category.entity").Category>;
    remove(id: string): Promise<void>;
}
