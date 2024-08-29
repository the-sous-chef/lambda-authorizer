#!/bin/sh

GREEN='\033[0;32m'
RED='\033[0;31m'

if [ ! -f "$(pwd)/.husky/_/husky.sh" ]; then
    echo -e "${RED}Husky is not installed. Installing Husky..."
    npx husky

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Husky successfully installed!"

        if [ ! -f "$(pwd)/.husky/commit-msg" ]; then
            echo "npx --no-install commitlint --edit \"\$1\"" > .husky/commit-msg
            echo "npx --no-install lint-staged" > .husky/pre-commit

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Husky commitlint successfully created!"
            else
                echo -e "${RED}There was an issue creating the Husky commitlint pre-commit hook."
                rm -rf $(pwd)/.husky
            fi
        fi
    else
        echo -e "${RED}There was an error installing Husky. Try installing it after the package is created."
        rm -rf $(pwd)/.husky
    fi
fi
