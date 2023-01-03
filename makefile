all: node_modules
	npm run test
	npm run eslint
	npm run htmlhint
	npm run stylelint

node_modules:
	npm install

solve:
	npm run solve -- --id 1 --max 5

solveall:
	npm run solve -- --id all --time 10

solve2:
	npm run solve -- -h 5 -w 5 -s s-102 --max 10
