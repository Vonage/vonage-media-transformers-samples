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
    const int MAX_PIPE_BUFFER_SIZE = 64000;

    void __stdcall send_named_pipe(char *pipePath, char *buf, int size)
    {
        int fd;

        // Creating the named file(FIFO)
        // mkfifo(<pathname>, <permission>)
        mkfifo(pipePath, 0666);

        fd = open(pipePath, O_WRONLY);

        write(fd, buf, size);
        close(fd);
    }

    int __stdcall read_from_pipe(char *pipePath, unsigned char *buf)
    {
        int fd;

        // Creating the named file(FIFO)
        // mkfifo(<pathname>, <permission>)
        mkfifo(pipePath, 0666);

        fd = open(pipePath,O_RDONLY);
        int bytesRead = read(fd, buf, MAX_PIPE_BUFFER_SIZE);
        close(fd);

        return bytesRead;
    }
}