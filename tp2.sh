#!/bin/bash

l=2
#2^seq cantidad de procesadores
for i in $(seq 0 3); 
do
	j=$((l ** $i))
	#seq cantidad de pasadas
	for k in $(seq 0 29);
	do
		{ /usr/bin/time ./tp2.o $j ; } 2>> time_parallel_notebook.txt
		t=$((k + 1))
		echo pasada n°$t	
	done	
done