#include <cstdio>
#include <iostream>
#include <stack>
#include <set>
#include <map>
#include <string>
#include <algorithm>
#include <time.h>

const int kWidth = 19;
const int kHeight = 9;
const int kXMin = 1;
const int kXMax = kWidth - 1;
const int kYMin = 1;
const int kYMax = kHeight - 1;

const int kStateNull = 0;
const int kStateTarget = 1;
const int kStateUser = 2;
const int kStateWall = 3;

const int kNum = 6;

void printLevel();

int states[kHeight][kWidth] = {
    {3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3},
    {3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3},
    {3, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 3},
    {3, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 3},
    {3, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 3},
    {3, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 3},
    {3, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 3},
    {3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3},
    {3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3}};

const int dxs[] = {0, 1, 0, -1};
const int dys[] = {-1, 0, 1, 0};

int userX = 1;
int userY = 1;

bool isConnected()
{
    int statesTemp[kHeight][kWidth];
    memcpy(statesTemp, states, sizeof(int) * kHeight * kWidth);
    int x0;
    int y0;
    for (int y = kYMin; y < kYMax; ++y)
    {
        for (int x = kXMin; x < kXMax; ++x)
        {
            if (statesTemp[y][x] == kStateTarget)
            {
                x0 = x;
                y0 = y;
                goto LABEL;
            }
        }
    }
LABEL:;

    std::stack<std::pair<int, int>> st;
    st.push(std::make_pair(x0, y0));
    statesTemp[y0][x0] = kStateNull;
    int count = 0;
    while (!st.empty())
    {
        const std::pair<int, int> xy = st.top();
        st.pop();
        for (int i = 0; i < 4; i++)
        {
            const int xx = xy.first + dxs[i];
            const int yy = xy.second + dys[i];
            if (statesTemp[yy][xx] == kStateTarget)
            {
                count++;
                statesTemp[yy][xx] = kStateNull;
                st.push(std::make_pair(xx, yy));
            }
        }
    }
    return count == 44;
}

bool isSymmetry()
{
    int minX = kXMax;
    int maxX = 0;
    int minY = kYMax;
    int maxY = 0;
    for (int y = kYMin; y < kYMax; ++y)
    {
        for (int x = kXMin; x < kXMax; ++x)
        {
            if (states[y][x] == kStateTarget)
            {
                minX = std::min(minX, x);
                maxX = std::max(maxX, x);
                minY = std::min(minY, y);
                maxY = std::max(maxY, y);
            }
        }
    }
    for (int y = minY; y < maxY; ++y)
    {
        for (int x = minX; x < maxX; ++x)
        {
            if (
                states[y][x] == kStateTarget &&
                states[minY + maxY - y][minX + maxX - x] != kStateTarget)
            {
                return false;
            }
        }
    }
    return true;
}

bool isCompleted()
{
    return isConnected() && isSymmetry();
}

std::string getStateStr()
{
    std::string res = "";
    int count = 0;
    int val = 0;
    for (int y = kYMin; y < kYMax; ++y)
    {
        for (int x = kXMin; x < kXMax; ++x)
        {
            count++;
            val <<= 1;
            val += states[y][x] == kStateTarget ? 1 : 0;
            if (count % kNum == 0)
            {
                char c = '0' + val;
                res += c;
                val = 0;
            }
        }
    }
    val <<= kNum - (count % kNum);
    char c = '0' + val;
    res += c;

    {
        char c = '0' + userX;
        res += c;
    }
    {
        char c = '0' + userY;
        res += c;
    }
    // std::cout << res << std::endl;
    return res;
}

void applyStateStr(std::string stateStr)
{
    int count = 0;
    for (int y = kYMin; y < kYMax; ++y)
    {
        for (int x = kXMin; x < kXMax; ++x)
        {
            const int val = stateStr[count / kNum] - 0x30;
            states[y][x] = (val >> (kNum - 1 - (count % kNum))) & 1;
            count++;
        }
    }
    const int pos = (119 + kNum) / kNum;
    userX = stateStr[pos] - 0x30;
    userY = stateStr[pos + 1] - 0x30;
    states[userY][userX] = kStateUser;
}

bool updateMoveFlags(int dx, int dy)
{
    // this.resetMoveFlags();
    const int x0 = userX;
    const int y0 = userY;
    int x = x0;
    int y = y0;
    int count = 0;
    do
    {
        count++;
        x += dx;
        y += dy;
        if (states[y][x] == kStateWall)
        {
            return false;
        }
    } while (states[y][x] != kStateNull);

    states[y0][x0] = kStateNull;
    states[y0 + dy][x0 + dx] = kStateUser;
    userY = y0 + dy;
    userX = x0 + dx;
    if (count != 1)
    {
        states[y][x] = kStateTarget;
    }
    return true;
}

int main()
{
    // printLevel();
    const bool completedFlag = isCompleted();
    if (completedFlag)
    {
        printf("Completed on start.");
        return 0;
    }

    time_t timeStart, timeEnd;
    timeStart = time(NULL);

    std::map<std::string, std::string> stateStrMap;
    std::string replayStr = "";
    {
        const std::string stateStr = getStateStr();
        stateStrMap[stateStr] = replayStr;
    }
    int step = 0;

    std::string prefixStep = "";
    // prefixStep = "1111211332121211221111033";
    for (char dirChar : prefixStep)
    {
        step++;
        const int dir = dirChar - 0x30;
        const int dx = dxs[dir];
        const int dy = dys[dir];

        const bool moveFlag = updateMoveFlags(dx, dy);
        if (!moveFlag)
        {
            std::cerr << "Error: moveFlag failed on prefix-step." << std::endl;
            return -1;
        }

        const std::string stateStr = getStateStr();
        if (stateStrMap.find(stateStr) != stateStrMap.end())
        {
            std::cerr << "Warning: Same state exists." << std::endl;
        }

        const bool completedFlag = isCompleted();
        if (completedFlag)
        {
            std::cerr << "Error : Completed on prefix-step." << std::endl;
            return -1;
        }
        replayStr += dirChar;
        stateStrMap[stateStr] = replayStr;
    }

    int stateCount = 0;

    std::set<std::string> nextStateStrSet;
    {
        std::string stateStr = getStateStr();
        nextStateStrSet.insert(stateStr);
    }

    int maxStep = 29;
    int solutionNum = 0;
    for (; step < maxStep;)
    {
        std::set<std::string> currentStateStrSet = nextStateStrSet;
        nextStateStrSet = std::set<std::string>();
        for (std::string currentStateStr : currentStateStrSet)
        {
            std::string currentReplyStr = stateStrMap[currentStateStr];
            for (int dir = 0; dir < 4; ++dir)
            {
                applyStateStr(currentStateStr);

                const int dx = dxs[dir];
                const int dy = dys[dir];
                const bool moveFlag = updateMoveFlags(dx, dy);
                if (!moveFlag)
                    continue;

                std::string stateStr = getStateStr();

                if (stateStrMap.find(stateStr) != stateStrMap.end())
                    continue;

                std::string replayStr = currentReplyStr + (char)('0' + dir);
                stateStrMap[stateStr] = replayStr;

                const bool completedFlag = isCompleted();
                if (completedFlag)
                {
                    printf("Completed!\n");
                    std::cout << replayStr << std::endl;
                    return 0;
                }
                else
                {
                    nextStateStrSet.insert(stateStr);
                }
            }
        }

        if (nextStateStrSet.size() == 0)
        {
            printf("No solutions\n");
            return 0;
        }
        step++;
        {
            timeEnd = time(NULL);
            std::cout << step << " steps completed. [Time: " << (timeEnd - timeStart) << " sec.] [map.size:" << stateStrMap.size() << "]" << std::endl;
        }
    }
    return 0;
}

void printLevel()
{
    for (int y = 1; y < kYMax; ++y)
    {
        for (int x = 1; x < kXMax; ++x)
        {
            printf("%d", states[y][x]);
        }
        printf("\n");
    }
}
