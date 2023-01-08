all: node_modules
	npm run test
	npm run test-point
	npm run test-reflection
	npm run eslint
	npm run htmlhint
	npm run stylelint

node_modules:
	npm install

test:
	npm run test
	npm run test-point
	npm run test-reflection

solve:
	npm run solve -- --id 1 --max 5

solve2:
	npm run solve -- -h 5 -w 5 -s s-102 --max 10


solveall:
	npm run solve -- --id all --time 10

solveall2:
	npm run solve -- --id all --all --max 1000 --time 10
