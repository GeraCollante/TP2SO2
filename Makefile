CC 			:= gcc
CFLAGS 		:= -Iinclude -pedantic -std=gnu99 -Wall -Werror -pg
LDFLAGS 	:= -lnetcdf -fopenmp
BIN			:= bin
SRC			:= src
INCLUDE		:= include
PYTHON		:= python
TP2 		:= tp2
PYIMG		:= showOutput.py
THREADS 	:= 8
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:~/Development/SO2/hpc/libs/netcdf/lib/

##

SRC1 		:= tp2.c
OBJ1 		:= $(SRC1:.c=.o)
SRC1PATH	:= $(patsubst %,src/%, $(OBJ1))

vpath %.c $(SRC)
vpath %.o $(SRC)

all: $(BIN)/$(TP2)

.PHONY: clean
clean:
	-$(RM) $(BIN)/$(TP2)
	-$(RM) $(SRC1PATH)

run: all
	./$(BIN)/$(TP2)

$(BIN)/$(TP2) : $(SRC1)
	$(CC) $(CFLAGS) $^ -o $@ $(LDFLAGS)

img:	
	$(PYTHON) $(PYIMG)

perf:
	sudo perf record -g ./$(BIN)/$(TP2) $(THREADS)
	sudo perf report

gprof:
	gprof $(BIN)/$(TP2) gmon.out > analisis.txt

valgrind:
	valgrind --tool=callgrind --dump-instr=yes --dump-line=yes --collect-jumps=yes --separate-threads=yes --simulate-cache=yes ./$(BIN)/$(TP2) $(THREADS)
