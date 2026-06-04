package judge

import "strings"

type Comparator interface {
	Compare(expected, actual []byte) bool
}

type TokenComparator struct{}

func (TokenComparator) Compare(expected, actual []byte) bool {
	return normalizeTokens(string(expected)) == normalizeTokens(string(actual))
}

func normalizeTokens(value string) string {
	return strings.Join(strings.Fields(value), " ")
}
