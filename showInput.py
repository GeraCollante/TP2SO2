import matplotlib
import matplotlib.pyplot as plt
import netCDF4
from pdb import set_trace as bp
# open a local NetCDF file or remote OPeNDAP URL

print ("entered main")
url = 'input.nc'
nc = netCDF4.Dataset(url)

    # examine the variables

#print (nc.variables.keys())
#print (nc.variables['CMI'])

    # sample every 10th point of the 'z' variable
topo = nc.variables['CMI'][::10,::10][::]
# make image
plt.figure(figsize=(10,10))
plt.gray()
plt.imshow(topo,origin='lower')
plt.title(nc.title)
plt.savefig('imagenOriginal.png', bbox_inches=0)
print ("FINISH")