#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main() {
	
	const int mallocs = 10000;
	const int size = 50000;

	void *mem[mallocs];

	int total = 0;

	for(int n=0;n<mallocs;n++) {
		printf("malloc %d %d (tot: %d)\n", size, n, total);
		mem[n] = malloc(size);
		if(mem[n] == NULL) {
			printf("!! malloc failed.");
			break;
		}
		total += size;
		usleep(500);
	}


	sleep(30);

}