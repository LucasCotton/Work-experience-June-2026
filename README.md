# Change Risk Analyzer

A lightweight, rule-based command-line tool built with Bun to analyze Git diffs and calculate a code change risk score based on pattern matching.

## Features

* Parses standard `.diff` or patch files.
* Detects sensitive file modifications (configuration, environment, authentication logic).
* Identifies dangerous keywords and code patterns (`eval`, hardcoded credentials, unresolved technical debt).
* Computes an overall qualitative risk classification (LOW, MEDIUM, HIGH) with a clear breakdown of reasons.
* An overall "score" will be provided at the end of the program, this will be an integer value.

## Prerequisites

You need [Bun](https://bun.sh/) installed on your local machine to run this project.
Ensure that you have a path where you can store all of the required files.

## Installation

1. Clone or download this repository to your local machine.
2. Ensure your main script file is named `changerisk.ts`.

## Usage

* EXAMPLE
changerisk.ts test123.txt
To analyze a diff file, run the script and pass the path to your target file as an argument;
Ensure that the desired directory is selected by using (cd "Your path directory" ) 

```bash
bun changerisk.ts path/to/your/file.diff
