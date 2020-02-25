#ifndef HEADER_FILE
#define HEADER_FILE

#include <netcdf.h>
#include <omp.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/time.h>
#include <time.h>
#include <unistd.h>

/* Manejar errores imprimiendo un mensaje de error y saliendo con estado no cero */
#define ERRCODE 2
#define ERR(e) {printf("Error: %s\n", nc_strerror(e)); exit(ERRCODE);}
/* Nombre del archivo a leer */
#define INPUTFILE "input.nc"
/* Nombre del archivo a escribir */
#define OUTPUTFILE "output.nc"
//#define NUM_THREADS sysconf(_SC_NPROCESSORS_ONLN)
#define MASK_WIDTH1 3 	//filas kernel
#define MASK_WIDTH2 3 	//columnas kernel
#define WIDTH1 21696 	//filas
#define WIDTH2 21696 	//columnas

//Definicion de funciones
short **allocate(int, int);
void print_data(short **, int, int);
int loadMatrix(short **);
void conv(short **, short **, int);
void writeFile(short **);

#endif