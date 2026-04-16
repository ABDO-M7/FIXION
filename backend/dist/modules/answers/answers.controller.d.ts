import { AnswersService, CreateAnswerDto } from './answers.service';
export declare class AnswersController {
    private readonly answersService;
    constructor(answersService: AnswersService);
    create(questionId: string, dto: CreateAnswerDto, user: any): Promise<import("./entities/answer.entity").Answer>;
    findByQuestion(questionId: string): Promise<import("./entities/answer.entity").Answer[]>;
    update(id: string, dto: Partial<CreateAnswerDto>, user: any): Promise<import("./entities/answer.entity").Answer>;
    remove(id: string, user: any): Promise<void>;
}
