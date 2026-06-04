package service

import "onlinejudge/backend/internal/repository"

const (
	PermissionViewProblems          = "problems:view"
	PermissionSubmitCode            = "submissions:create"
	PermissionViewOwnSubmissions    = "submissions:view_own"
	PermissionViewPublicSubmissions = "submissions:view_public"
	PermissionCreateProblem         = "problems:create"
	PermissionEditOwnProblem        = "problems:edit_own"
	PermissionManageTestCases       = "test_cases:manage"
	PermissionManageCheckers        = "checkers:manage"
	PermissionEditAllProblems       = "problems:edit_all"
	PermissionViewAllSubmissions    = "submissions:view_all"
	PermissionManageUsers           = "users:manage"
	PermissionManageContests        = "contests:manage"
	PermissionRejudge               = "judge:rejudge"
	PermissionManageLanguages       = "languages:manage"
	PermissionViewJudgeWorkers      = "judge_workers:view"
)

var RolePermissions = map[string][]string{
	repository.RoleUser: {
		PermissionViewProblems,
		PermissionSubmitCode,
		PermissionViewOwnSubmissions,
		PermissionViewPublicSubmissions,
	},
	repository.RoleProblemSetter: {
		PermissionViewProblems,
		PermissionSubmitCode,
		PermissionViewOwnSubmissions,
		PermissionViewPublicSubmissions,
		PermissionCreateProblem,
		PermissionEditOwnProblem,
		PermissionManageTestCases,
		PermissionManageCheckers,
	},
	repository.RoleJudgeAdmin: {
		PermissionViewProblems,
		PermissionSubmitCode,
		PermissionViewOwnSubmissions,
		PermissionViewPublicSubmissions,
		PermissionViewAllSubmissions,
		PermissionRejudge,
		PermissionManageLanguages,
		PermissionViewJudgeWorkers,
	},
	repository.RoleAdmin: {
		PermissionViewProblems,
		PermissionSubmitCode,
		PermissionViewOwnSubmissions,
		PermissionViewPublicSubmissions,
		PermissionCreateProblem,
		PermissionEditOwnProblem,
		PermissionManageTestCases,
		PermissionManageCheckers,
		PermissionEditAllProblems,
		PermissionViewAllSubmissions,
		PermissionManageUsers,
		PermissionManageContests,
		PermissionRejudge,
		PermissionManageLanguages,
		PermissionViewJudgeWorkers,
	},
}

func IsValidRole(role string) bool {
	_, ok := RolePermissions[role]
	return ok
}

func HasPermission(role, permission string) bool {
	for _, candidate := range RolePermissions[role] {
		if candidate == permission {
			return true
		}
	}
	return false
}

func HasAnyRole(role string, allowed ...string) bool {
	if role == repository.RoleAdmin {
		return true
	}
	for _, candidate := range allowed {
		if role == candidate {
			return true
		}
	}
	return false
}
