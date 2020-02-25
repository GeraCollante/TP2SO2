#!/bin/bash

# ssh Estudiante56@200.16.30.253  pass: #dc12x5b

#primer paso intalar netcdf con el script install_netcdf4.sh 
#(lo mas optimos es descargarlo del lev con wget).

#para compilar con intel ejecutar (icc source.c -qopenmp -o binario )
#se pueden utilizar flags de optimizacion como  -xCORE_AVX2, -xCORE_AVX513 o cualquier otro que deseen.
source /opt/intel/compilers_and_libraries_2018.5.274/linux/bin/compilervars_global.sh -arch intel64 -platform linux
source /opt/intel/compilers_and_libraries_2018.5.274/linux/bin/compilervars.sh -arch intel64 -platform linux

#agregar variables entorno de netcdf (despues de instalar script install_netcdf4.sh )
export C_INCLUDE_PATH=$C_INCLUDE_PATH:~/Development/SO2/hpc/libs/netcdf/include/ 
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:~/Development/SO2/hpc/libs/netcdf/lib/

#para compilar usar el make (ver que descomentar del mismo)
#para compilar separado se usa (en caso de fallas con la libreria netcdf):
#gcc tp2.c -o tp2.o -lnetcdf -L/home/Estudiante27/Development/SO2/hpc/libs/netcdf/lib/ -fopenmp -std=gnu99
