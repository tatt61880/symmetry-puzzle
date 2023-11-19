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

test-line:
	npm run test-line

tset-point:
	npm run test-point

line:
	npm run solve -- --id all --all --max 1000 --time 10 --line > all-line.txt

point:
	npm run solve -- --id all --all --max 1000 --time 10 > all-point.txt

solveall:
	npm run solve -- --id all --time 10
