# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from django.contrib.gis.geos import GEOSGeometry

from django.conf import settings
from django.db import connection

from apps.modeling.mapshed.calcs import animal_energy_units

ANIMAL_KEYS = settings.GWLFE_CONFIG['AnimalKeys']
ANIMAL_NAMES = settings.GWLFE_DEFAULTS['AnimalName']

ANIMAL_DISPLAY_NAMES = dict(zip(ANIMAL_KEYS, ANIMAL_NAMES))


def animal_population(geojson):
    """
    Given a GeoJSON shape, call MapShed's `animal_energy_units` method
    to calculate the area-weighted county animal population. Returns a
    dictionary to append to the outgoing JSON for analysis results.
    """
    geom = GEOSGeometry(geojson, srid=4326)
    aeu_for_geom = animal_energy_units(geom)[2]
    aeu_return_values = []

    for animal, aeu_value in aeu_for_geom.iteritems():
        aeu_return_values.append({
            'type': ANIMAL_DISPLAY_NAMES[animal],
            'aeu': int(round(aeu_value)),
        })

    return {
        'displayName': 'Animals',
        'name': 'animals',
        'categories': aeu_return_values
    }


def point_source_pollution(geojson):
    """
    Given a GeoJSON shape, retrieve point source pollution data
    from the `ms_pointsource` table to display in the Analyze tab.
    Returns a dictionary to append to the outgoing JSON for analysis
    results.
    """
    geom = GEOSGeometry(geojson, srid=4326)

    sql = '''
          SELECT city, npdes_id, mgd, kgn_yr, kgp_yr
          FROM ms_pointsource
          WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromText(%s), 4326))
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [geom.wkt])

        if cursor.rowcount != 0:
            columns = [col[0] for col in cursor.description]
            point_source_results = [dict(zip(columns, row)) for row in
                                    cursor.fetchall()]
        else:
            point_source_results = []

    return {
        'displayName': 'Point Source',
        'name': 'pointsource',
        'categories': point_source_results
    }
