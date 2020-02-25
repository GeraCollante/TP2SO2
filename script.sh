#!/bin/bash

rm txt/TP2.txt
for n in $(seq 1 256)
do
  rm txt/TP2_Con_OpenMP_$n.txt
done

for i in $(seq 1 30);
do
  echo "---"
  echo $i
  ./filtrar >> txt/TP2.txt
  for n in 1 2 3 4;
  do
    echo $n
    ./filtrarOMP $n >> txt/TP2_Con_OpenMP_$n.txt
  done
  for n in 8 16 32;
  do
    echo $n
    ./filtrarOMP $n >> txt/TP2_Con_OpenMP_$n.txt
  done
done
