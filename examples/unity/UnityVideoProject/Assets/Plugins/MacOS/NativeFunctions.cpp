#include <string>
#include <stdio.h>
#include <string.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

using namespace std;

extern "C" 
{
            // FIFO file path
    const char * myfifo = "/Users/mhamed/Library/Containers/vonage.macOS-Test/Data/myfifo";

    int __stdcall CountLettersInString(wchar_t* str)
    {
        wstring ws(str);
        // your new String
        string result(ws.begin(), ws.end());
        return (int)(result.size() + 1) / 2;
    }

    int __stdcall add_two_numbers(int a, int b)
    {
        return a+b;
    }
    
    void __stdcall send_named_pipe(char *msg)
    {
        int fd;

        // Creating the named file(FIFO)
        // mkfifo(<pathname>, <permission>)
        mkfifo(myfifo, 0666);

        char arr1[80] = "test fifo from unity";

        strcpy(arr1, msg);

        fd = open(myfifo, O_WRONLY);

        write(fd, arr1, 80);
        close(fd);
    }

    void __stdcall read_from_pipe(unsigned char *result)
    {
        int fd;

        // Creating the named file(FIFO)
        // mkfifo(<pathname>, <permission>)
        mkfifo(myfifo, 0666);

        char buf[80] = {0};

        fd = open(myfifo,O_RDONLY);
        read(fd, buf, 80);
        close(fd);

        strcpy((char*)result, buf);
    }
}