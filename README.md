# Change Risk Analyzer

A small tool that reads a code change (a Git diff) and scores how risky it is
from a security point of view. Built for JavaScript/TypeScript projects.

## Features

* Parses standard `.diff` or patch files.
* Detects sensitive file modifications (configuration, environment, authentication logic).
* Identifies dangerous keywords and code patterns (`eval`, hardcoded credentials, unresolved technical debt).
* Computes an overall qualitative risk classification (LOW, MEDIUM, HIGH) with a clear breakdown of reasons.
* An overall "score" will be provided at the end of the program, this will be an integer value.

## Prerequisites

You need [Bun](https://bun.sh/) installed on your local machine to run this project.
Ensure that you have a path where you can store all of the required files.
To analyze a diff file, run the script and pass the path to your target file as an argument;
Ensure that the desired directory is selected by using (cd "Your path directory" ) 

## Installation

1. Ensure that [Bun](https://bun.sh/) is installed on your local machine to run this project.
2. Install the changerisk.ts file from this repository.
3. Open powershell and enter "bun changerisk.ts (YOUR FILE)
4. A security feedback score will be given as an integer.

## Built by

Lucas Cotton, during work experience at Cytix, June 2026.


```bash
bun changerisk.ts path/to/your/file.diff
