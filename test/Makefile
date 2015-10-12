
CXX ?= g++ -g -O0 -fPIC
CC ?= gcc -g -O0 -fPIC
AR ?= ar

CFLAGS ?= -std=c99

LDFLAGS ?= -lpthread -pthread

ARCH ?=x86

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

malloc_alot: malloc_alot.o 
	$(CXX) $(CFLAGS) $(LDFLAGS) $(LD_TEST_FLAGS) -I. $(TWLIBFLAG) -o $@ malloc_alot.o

tests: malloc_alot

