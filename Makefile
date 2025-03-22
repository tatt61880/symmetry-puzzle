all: node_modules
	npm run eslint
	npm run htmlhint
	npm run stylelint
	npm run test
	npm run test-line
	npm run test-point
	npm run test-special

node_modules:
	npm install

test:
	npm run test
	npm run test-line
	npm run test-point
	npm run test-special

test-line:
	npm run test-line

test-point:
	npm run test-point

test-special:
	npm run test-special

line:
	npm run solve -- --mode line --id all --all --max 1000 --time 10 > all-line.txt

point:
	npm run solve -- --mode point --id all --all --max 1000 --time 10 > all-point.txt

special:
	npm run solve -- --mode special --id all --all --max 1000 --time 10 > all-special.txt

solveall:
	npm run solve -- --id all --time 10

backup:
	npm run solve -- --mode all --id all --all --max 1000 --time 10 --backup
