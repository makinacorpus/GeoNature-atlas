--Toutes les observations
DROP materialized view atlas.vm_observations;
CREATE MATERIALIZED VIEW atlas.vm_observations AS
    WITH centroid_synthese AS (
         SELECT st_centroid(cor.geom) AS geom_point,
            s.id_synthese AS id_observation,
		    s.date_min AS dateobs,
		    (s.altitude_min + s.altitude_max) / 2 AS altitude_retenue,
		    s.observers AS observateurs,
		    s.id_dataset,
            s.cd_nom,
            s.id_nomenclature_sensitivity,
            s.the_geom_point,
            cor.type_code,
           cor.id_area
           FROM synthese.synthese s
             JOIN atlas.vm_cor_area_synthese cor ON cor.id_synthese = s.id_synthese AND cor.is_blurred_geom IS TRUE
        )
SELECT
    c.geom_point,
    c.id_observation,
    c.dateobs,
    c.altitude_retenue,
    c.observateurs,
    c.id_dataset,
    c.type_code,
    area.id_area,
    tx.cd_ref,
    CASE
        WHEN sensi.cd_nomenclature::text = '0'::text
            THEN st_transform(c.the_geom_point, 3857)
            ELSE st_transform(c.geom_point, 3857)
        END AS the_geom_point,
    CASE
        WHEN sensi.cd_nomenclature::text = '0'::text
            THEN st_asgeojson(st_transform(c.the_geom_point, 4326))
            ELSE st_asgeojson(st_transform(c.geom_point, 4326))
        END AS geojson_point,
    sensi.cd_nomenclature AS cd_sensitivity
FROM centroid_synthese c
         JOIN atlas.vm_taxref tx ON tx.cd_nom = c.cd_nom
         LEFT JOIN synthese.t_nomenclatures sensi ON c.id_nomenclature_sensitivity = sensi.id_nomenclature
         JOIN atlas.vm_l_areas area ON area.id_area = c.id_area;


CREATE UNIQUE INDEX ON atlas.vm_observations (id_observation);
CREATE INDEX ON atlas.vm_observations (cd_ref);
CREATE INDEX ON atlas.vm_observations (id_area);
CREATE INDEX ON atlas.vm_observations (altitude_retenue);
CREATE INDEX ON atlas.vm_observations (dateobs);
CREATE INDEX index_gist_vm_observations_the_geom_point ON atlas.vm_observations USING gist (the_geom_point);
CREATE INDEX index_gist_vm_observations_geom_point ON atlas.vm_observations USING gist (geom_point);
