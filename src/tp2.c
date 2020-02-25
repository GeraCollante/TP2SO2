#include "tp2.h"

int main(int argc, char *argv[])
{
	//DEFINICION DE PARAMETROS
	int 	ncid, retval;
	//int 	NUM_THREADS = sysconf(_SC_NPROCESSORS_ONLN);
	int 	NUM_THREADS;
    short 	**input, **output;

    if (argc > 1)
    {
    	NUM_THREADS = atoi(argv[1]);
      	//for (count = 1; count < argc; count++)
		//{
	  	//	printf("argv[%d] = %s\n", count, argv[count]);
		//}
    }
  	else
    {
      	printf("No hay argumentos.\n");
      	exit(1);
    }
    printf("Cantidad de hilos: %i\n", NUM_THREADS);
    //INICIO
    input 	= allocate(WIDTH1,WIDTH2);
    output 	= allocate(WIDTH1,WIDTH2);
    //Cargo matriz
	ncid 	= loadMatrix(input);
    //Convolucion	
	conv(input, output, NUM_THREADS);
	//Escribimos archivo
	writeFile(output);
	//Cerramos archivo
	if ((retval = nc_close(ncid)))
        ERR(retval);
    //printf("Tiempo total: %fseg\n", conv_time + write_time + open_time);
    return 0;
}


#include "tp2.h"

/**
 * @brief Allocate memory for matrix
 * 
 * @param h height
 * @param w width
 * @return short** 
 */
short **allocate(int h, int w){
    short **p;
    int i;
    p=(short **)malloc(h*sizeof(short *));
    for(i=0;i<h;i++){
        p[i]=(short *) malloc(w * sizeof(short));
    }
    return p;
}

/**
 * @brief Print data matrix
 * 
 * @param p
 * @param h height
 * @param w width
 */
void print_data(short **p, int h, int w){
    int i,j;

    for(i=0;i<h;i++){
        for(j=0;j<w;j++){
            printf("%5hi ",p[i][j]);
            printf("\n");
        }
    }
}

/**
 * @brief Load matrix
 * 
 * @param p
 * @return int 
 */
int loadMatrix(short **p){
	int retval, ncid, varid;
	clock_t start,end;

    if ((retval = nc_open(INPUTFILE, NC_NOWRITE, &ncid)))
        ERR(retval);
    // Obtenemos elvarID de la variable CMI.
    if ((retval = nc_inq_varid(ncid, "CMI", &varid)))
        ERR(retval);
    // Leemos la matriz.
    puts("Cargamos matriz");
	start = clock();
    if ((retval = nc_get_var_short(ncid, varid, &p[0][0])))
        ERR(retval);
    end = clock();
    double open_time = ((double) (end - start)) / CLOCKS_PER_SEC;
	printf("Tiempo para abrir archivo: %fseg\n", open_time);
    return ncid;
}

/**
 * @brief Convolution
 * 
 * @param input         input matrix
 * @param output        output matrix
 * @param NUM_THREADS   threads number
 */
void conv(short **input, short **output, int NUM_THREADS){
	short 	kernel[MASK_WIDTH1][MASK_WIDTH2] = {{-1, -1, -1}, {-1, 9, -1}, {-1, -1, -1}};
    int 	kCenterX = MASK_WIDTH2 / 2; 
    int		kCenterY = MASK_WIDTH1 / 2;
	//clock_t start, end;
    //start = clock();
    puts("Inicio de convolucion");
    double ini = omp_get_wtime();
	omp_set_num_threads(NUM_THREADS);
	#pragma omp parallel for collapse(4) // shared(n,m,nn,mm,ii,jj)
		for(int i=0; i < WIDTH1; ++i)         		    // rows
		{	
			for(int j=0; j < WIDTH1; ++j)          		// cols
    		{
    			for(int m=0; m < MASK_WIDTH1; ++m)     	// kernel rows
        		{
            		for(int n=0; n < MASK_WIDTH1; ++n) 	// kernel cols
            		{
    					int mm = MASK_WIDTH2 - 1 - m;	// row index of the mirrored kernel
        				int ii = i + (kCenterY - mm);
        				int nn = MASK_WIDTH1 - 1 - n;  	// col index of the mirrored kernel
        				int jj = j + (kCenterX - nn);
                	    // Ignore entries that are out of bounds
                		if( ii >= 0 && ii < WIDTH1 && jj >= 0 && jj < WIDTH2 )
                    	output[i][j] += input[ii][jj] * kernel[mm][nn];
            		}
        		}
    		}
		}
	//end = clock();
	double fin = omp_get_wtime();
	//double conv_time = ((double) (end - start)) / CLOCKS_PER_SEC;
	double total = fin - ini;
	//printf("Tiempo de convolucion: %fseg\n", total);
    printf("%f\n", total);
	//puts("Fin de convolucion");
}

/**
 * @brief Write file
 * 
 * @param output matriz
 */
void writeFile(short **output){
int status, ncid2, varid;
clock_t start, end;

puts("Empiezo a escribir nc");
start = clock();
status = nc_open(OUTPUTFILE, NC_WRITE, &ncid2);
    if (status != NC_NOERR) 
        ERR(status);
	    // Obtenemos elvarID de la variable CMI.
    if ((status = nc_inq_varid(ncid2, "CMI", &varid)))
        ERR(status);	
    if ((status = nc_put_var_short(ncid2,varid, &output[0][0])))
        ERR(status);
    if ((status = nc_close(ncid2)))
        ERR(status);
end = clock();
double write_time = ((double) (end - start)) / CLOCKS_PER_SEC;
printf("Tiempo de escritura de archivo: %fseg\n", write_time);    
puts("Finalizó escritura nc");
}
