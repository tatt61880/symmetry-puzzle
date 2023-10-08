all: node_modules
	npm run eslint
	npm run htmlhint
	npm run stylelint
	npm run test
	npm run test-line
	npm run test-point

node_modules:
	npm install

test:
	npm run test
	npm run test-line
	npm run test-point

line:
	npm run test-line

point:
	npm run test-point

solve:
	npm run solve -- --id 1 --max 5

solve2:
	npm run solve -- -h 5 -w 5 -s s-102 --max 10


solveall:
	npm run solve -- --id all --time 10

solveall2:
	npm run solve -- --id all --all --max 1000 --time 10
