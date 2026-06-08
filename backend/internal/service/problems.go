package service

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"onlinejudge/backend/internal/repository"
	"onlinejudge/backend/internal/storage"
)

type ProblemService struct {
	store   *repository.Store
	storage storage.Storage
}

func NewProblemService(store *repository.Store, objectStorage storage.Storage) *ProblemService {
	return &ProblemService{store: store, storage: objectStorage}
}

func (s *ProblemService) ListPublic(ctx context.Context) ([]repository.Problem, error) {
	return s.store.ListPublicProblems(ctx)
}

type AdminProblemInput struct {
	Title             string
	Slug              string
	ProblemCode       string
	StatementMarkdown string
	ConstraintsText   string
	InputFormat       string
	OutputFormat      string
	TimeLimitMS       int
	MemoryLimitKB     int
	Score             int
	Difficulty        string
	Tags              []string
	IsPublic          bool
	TestCases         []AdminProblemTestCaseInput
}

type AdminProblemTestCaseInput struct {
	Name     string
	Input    string
	Output   string
	IsSample bool
	Score    int
}

type AdminProblemTestCase struct {
	ID         int64
	Name       string
	Input      string
	Output     string
	IsSample   bool
	IsHidden   bool
	Score      int
	OrderIndex int
}

const (
	maxAdminPublicTestCases = 3
	maxAdminHiddenTestCases = 10
)

func (s *ProblemService) ListAdmin(ctx context.Context) ([]repository.AdminProblem, error) {
	return s.store.ListAdminProblems(ctx)
}

func (s *ProblemService) GetAdmin(ctx context.Context, id int64) (repository.AdminProblem, error) {
	return s.store.GetAdminProblemByID(ctx, id)
}

func (s *ProblemService) CreateAdmin(ctx context.Context, actorUserID int64, input AdminProblemInput) (repository.AdminProblem, error) {
	params, err := adminProblemParams(input, repository.ProblemStatusDraft)
	if err != nil {
		return repository.AdminProblem{}, err
	}
	if input.IsPublic {
		return repository.AdminProblem{}, invalidInput("作成時は公開状態をOFFにしてください")
	}
	if input.TestCases != nil {
		if err := validateAdminTestCaseInputs(input.TestCases); err != nil {
			return repository.AdminProblem{}, err
		}
	}
	params.Status = repository.ProblemStatusDraft
	params.IsPublic = params.Status == repository.ProblemStatusPublic
	params.CreatedByUserID = sql.NullInt64{Int64: actorUserID, Valid: true}
	problem, err := s.store.CreateAdminProblem(ctx, params)
	if err != nil {
		return repository.AdminProblem{}, err
	}
	if input.TestCases != nil {
		if err := s.replaceAdminTestCases(ctx, problem.ID, input.TestCases); err != nil {
			return repository.AdminProblem{}, err
		}
	}
	return s.store.GetAdminProblemByID(ctx, problem.ID)
}

func (s *ProblemService) UpdateAdmin(ctx context.Context, id int64, input AdminProblemInput) (repository.AdminProblem, error) {
	current, err := s.store.GetAdminProblemByID(ctx, id)
	if err != nil {
		return repository.AdminProblem{}, err
	}

	params, err := adminProblemParams(input, current.Status)
	if err != nil {
		return repository.AdminProblem{}, err
	}
	if input.TestCases != nil {
		if err := validateAdminTestCaseInputs(input.TestCases); err != nil {
			return repository.AdminProblem{}, err
		}
	}
	if input.IsPublic {
		hasPublicCases := current.SampleCaseCount > 0
		if input.TestCases != nil {
			hasPublicCases = hasPublicTestCase(input.TestCases)
		}
		if !hasPublicCases {
			return repository.AdminProblem{}, invalidInput("公開するには公開テストケースが1つ以上必要です")
		}
		params.Status = repository.ProblemStatusPublic
	} else {
		switch current.Status {
		case repository.ProblemStatusDraft, repository.ProblemStatusArchived:
			params.Status = current.Status
		default:
			params.Status = repository.ProblemStatusPrivate
		}
	}
	params.IsPublic = params.Status == repository.ProblemStatusPublic
	problem, err := s.store.UpdateAdminProblem(ctx, id, params)
	if err != nil {
		return repository.AdminProblem{}, err
	}
	if input.TestCases != nil {
		if err := s.replaceAdminTestCases(ctx, problem.ID, input.TestCases); err != nil {
			return repository.AdminProblem{}, err
		}
	}
	return s.store.GetAdminProblemByID(ctx, problem.ID)
}

func (s *ProblemService) PublishAdmin(ctx context.Context, id int64) (repository.AdminProblem, error) {
	problem, err := s.store.GetAdminProblemByID(ctx, id)
	if err != nil {
		return repository.AdminProblem{}, err
	}
	if err := validatePublishable(problem); err != nil {
		return repository.AdminProblem{}, err
	}
	return s.store.UpdateAdminProblemStatus(ctx, id, repository.ProblemStatusPublic, true)
}

func (s *ProblemService) UnpublishAdmin(ctx context.Context, id int64) (repository.AdminProblem, error) {
	return s.store.UpdateAdminProblemStatus(ctx, id, repository.ProblemStatusPrivate, false)
}

func (s *ProblemService) ArchiveAdmin(ctx context.Context, id int64) (repository.AdminProblem, error) {
	return s.store.UpdateAdminProblemStatus(ctx, id, repository.ProblemStatusArchived, false)
}

func (s *ProblemService) CopyAdmin(ctx context.Context, actorUserID, id int64) (repository.AdminProblem, error) {
	problem, err := s.store.GetAdminProblemByID(ctx, id)
	if err != nil {
		return repository.AdminProblem{}, err
	}
	suffix := time.Now().UTC().Format("20060102150405")
	title := strings.TrimSpace(problem.Title)
	if title == "" {
		title = "Untitled Problem"
	}
	return s.store.CopyAdminProblem(
		ctx,
		id,
		actorUserID,
		fmt.Sprintf("%s Copy", title),
		fmt.Sprintf("%s-copy-%s", problem.Slug, suffix),
		fmt.Sprintf("%s-copy", problem.ProblemCode),
	)
}

func (s *ProblemService) ListAdminTestCases(ctx context.Context, problemID int64) ([]AdminProblemTestCase, error) {
	return s.listTestCasesWithContent(ctx, problemID, true)
}

func (s *ProblemService) listTestCasesWithContent(ctx context.Context, problemID int64, includeHidden bool) ([]AdminProblemTestCase, error) {
	cases, err := s.store.ListTestCasesByProblemID(ctx, problemID, includeHidden)
	if err != nil {
		return nil, err
	}

	resp := make([]AdminProblemTestCase, 0, len(cases))
	for _, tc := range cases {
		input, err := s.storage.Read(ctx, tc.InputPath)
		if err != nil {
			return nil, err
		}
		output, err := s.storage.Read(ctx, tc.OutputPath)
		if err != nil {
			return nil, err
		}
		resp = append(resp, AdminProblemTestCase{
			ID:         tc.ID,
			Name:       tc.Name,
			Input:      string(input),
			Output:     string(output),
			IsSample:   tc.IsSample,
			IsHidden:   tc.IsHidden,
			Score:      tc.Score,
			OrderIndex: tc.OrderIndex,
		})
	}
	return resp, nil
}

func (s *ProblemService) GetBySlug(ctx context.Context, slug string) (repository.Problem, []AdminProblemTestCase, error) {
	problem, err := s.store.GetProblemBySlug(ctx, slug)
	if err != nil {
		return repository.Problem{}, nil, err
	}
	cases, err := s.listTestCasesWithContent(ctx, problem.ID, false)
	if err != nil {
		return repository.Problem{}, nil, err
	}
	return problem, cases, nil
}

func (s *ProblemService) ListLanguages(ctx context.Context) ([]repository.Language, error) {
	return s.store.ListActiveLanguages(ctx)
}

func adminProblemParams(input AdminProblemInput, fallbackStatus string) (repository.AdminProblemParams, error) {
	title := strings.TrimSpace(input.Title)
	slug := strings.TrimSpace(input.Slug)
	statement := strings.TrimSpace(input.StatementMarkdown)
	if title == "" {
		return repository.AdminProblemParams{}, invalidInput("タイトルを入力してください")
	}
	if slug == "" {
		return repository.AdminProblemParams{}, invalidInput("slugを入力してください")
	}
	if statement == "" {
		return repository.AdminProblemParams{}, invalidInput("問題文 Markdown を入力してください")
	}
	if input.TimeLimitMS <= 0 {
		return repository.AdminProblemParams{}, invalidInput("実行時間制限 ms は1以上にしてください")
	}
	if input.MemoryLimitKB <= 0 {
		return repository.AdminProblemParams{}, invalidInput("メモリ制限 MB は1以上にしてください")
	}
	if input.Score < 0 {
		return repository.AdminProblemParams{}, invalidInput("得点は0以上にしてください")
	}

	difficulty := strings.TrimSpace(input.Difficulty)
	if difficulty != "" && difficulty != "beginner" && difficulty != "easy" && difficulty != "medium" && difficulty != "hard" {
		return repository.AdminProblemParams{}, invalidInput("難易度は beginner / easy / medium / hard から選んでください")
	}

	status := fallbackStatus
	if status == "" {
		status = repository.ProblemStatusDraft
	}

	return repository.AdminProblemParams{
		Title:             title,
		Slug:              slug,
		ProblemCode:       strings.TrimSpace(input.ProblemCode),
		StatementMarkdown: statement,
		ConstraintsText:   strings.TrimSpace(input.ConstraintsText),
		InputFormat:       strings.TrimSpace(input.InputFormat),
		OutputFormat:      strings.TrimSpace(input.OutputFormat),
		TimeLimitMS:       input.TimeLimitMS,
		MemoryLimitKB:     input.MemoryLimitKB,
		Score:             input.Score,
		Difficulty:        sql.NullString{String: difficulty, Valid: difficulty != ""},
		Tags:              cleanTags(input.Tags),
		Status:            status,
	}, nil
}

func (s *ProblemService) replaceAdminTestCases(ctx context.Context, problemID int64, input []AdminProblemTestCaseInput) error {
	if err := validateAdminTestCaseInputs(input); err != nil {
		return err
	}

	cases := make([]repository.AdminTestCaseParams, 0, len(input))
	publicIndex := 0
	hiddenIndex := 0
	for index, tc := range input {
		displayIndex := 0
		if tc.IsSample {
			publicIndex++
			displayIndex = publicIndex
		} else {
			hiddenIndex++
			displayIndex = hiddenIndex
		}
		name := cleanTestCaseName(tc.Name, displayIndex, tc.IsSample)
		group := "tests"
		if tc.IsSample {
			group = "samples"
		}
		fileName := cleanStorageFileName(name, index+1)
		inputPath := fmt.Sprintf("problems/%d/%s/%s.in", problemID, group, fileName)
		outputPath := fmt.Sprintf("problems/%d/%s/%s.out", problemID, group, fileName)

		if err := s.storage.Write(ctx, inputPath, []byte(tc.Input)); err != nil {
			return err
		}
		if err := s.storage.Write(ctx, outputPath, []byte(tc.Output)); err != nil {
			return err
		}

		cases = append(cases, repository.AdminTestCaseParams{
			Name:       name,
			InputPath:  inputPath,
			OutputPath: outputPath,
			IsSample:   tc.IsSample,
			IsHidden:   !tc.IsSample,
			Score:      tc.Score,
			GroupName:  sql.NullString{String: group, Valid: true},
			OrderIndex: index + 1,
		})
	}

	return s.store.ReplaceProblemTestCases(ctx, problemID, cases)
}

func validatePublishable(problem repository.AdminProblem) error {
	var issues []string
	if strings.TrimSpace(problem.Title) == "" {
		issues = append(issues, "タイトルがありません")
	}
	if strings.TrimSpace(problem.Slug) == "" {
		issues = append(issues, "slugがありません")
	}
	if strings.TrimSpace(problem.StatementMarkdown) == "" {
		issues = append(issues, "問題文がありません")
	}
	if problem.TimeLimitMS <= 0 {
		issues = append(issues, "実行時間制限がありません")
	}
	if problem.MemoryLimitKB <= 0 {
		issues = append(issues, "メモリ制限がありません")
	}
	if problem.SampleCaseCount <= 0 {
		issues = append(issues, "公開テストケースがありません")
	}
	if len(issues) > 0 {
		return invalidInput(strings.Join(issues, "、"))
	}
	return nil
}

func validateAdminTestCaseInputs(input []AdminProblemTestCaseInput) error {
	publicCount := 0
	hiddenCount := 0
	for _, tc := range input {
		if tc.IsSample {
			publicCount++
		} else {
			hiddenCount++
		}
	}
	if publicCount > maxAdminPublicTestCases {
		return invalidInput(fmt.Sprintf("公開テストケースは最大%d件までです", maxAdminPublicTestCases))
	}
	if hiddenCount > maxAdminHiddenTestCases {
		return invalidInput(fmt.Sprintf("hidden test caseは最大%d件までです", maxAdminHiddenTestCases))
	}

	publicIndex := 0
	hiddenIndex := 0
	for _, tc := range input {
		label := ""
		if tc.IsSample {
			publicIndex++
			label = fmt.Sprintf("公開テストケース%d", publicIndex)
		} else {
			hiddenIndex++
			label = fmt.Sprintf("Hidden %d", hiddenIndex)
		}
		if strings.TrimSpace(tc.Output) == "" {
			return invalidInput(fmt.Sprintf("%sの正解出力を入力してください", label))
		}
		if tc.Score < 0 {
			return invalidInput(fmt.Sprintf("%sの得点は0以上にしてください", label))
		}
	}
	return nil
}

func hasPublicTestCase(input []AdminProblemTestCaseInput) bool {
	for _, tc := range input {
		if tc.IsSample && strings.TrimSpace(tc.Output) != "" {
			return true
		}
	}
	return false
}

func invalidInput(message string) error {
	if strings.TrimSpace(message) == "" {
		return ErrInvalidInput
	}
	return fmt.Errorf("%w: %s", ErrInvalidInput, message)
}

func cleanTestCaseName(value string, index int, isSample bool) string {
	name := strings.TrimSpace(value)
	if name != "" {
		return name
	}
	if isSample {
		return fmt.Sprintf("sample_%02d", index)
	}
	return fmt.Sprintf("hidden_%02d", index)
}

func cleanStorageFileName(value string, index int) string {
	var builder strings.Builder
	for _, char := range strings.ToLower(strings.TrimSpace(value)) {
		switch {
		case char >= 'a' && char <= 'z':
			builder.WriteRune(char)
		case char >= '0' && char <= '9':
			builder.WriteRune(char)
		case char == '-' || char == '_':
			builder.WriteRune(char)
		default:
			builder.WriteRune('_')
		}
	}
	name := strings.Trim(builder.String(), "_-")
	if name == "" {
		return fmt.Sprintf("case_%02d", index)
	}
	return name
}

func cleanTags(tags []string) []string {
	seen := map[string]bool{}
	cleaned := make([]string, 0, len(tags))
	for _, tag := range tags {
		value := strings.TrimSpace(tag)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		cleaned = append(cleaned, value)
	}
	return cleaned
}
