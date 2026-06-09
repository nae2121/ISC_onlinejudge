-- +goose Up

ALTER TABLE submission_results
  DROP CONSTRAINT IF EXISTS submission_results_test_case_id_fkey,
  ADD CONSTRAINT submission_results_test_case_id_fkey
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE SET NULL;

-- +goose Down

ALTER TABLE submission_results
  DROP CONSTRAINT IF EXISTS submission_results_test_case_id_fkey,
  ADD CONSTRAINT submission_results_test_case_id_fkey
  FOREIGN KEY (test_case_id) REFERENCES test_cases(id);
