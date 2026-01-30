package main

import (
	"os"

	"github.com/norncorp/heimdall/internal/cli"
)

func main() {
	if err := cli.Execute(); err != nil {
		os.Exit(1)
	}
}
