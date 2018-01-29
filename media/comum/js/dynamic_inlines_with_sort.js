/* Created in March 2010 by Anderson Bráulio - Based in Hannes Rydén's file */

add_link_html = '<img src="/admin-media/img/admin/icon_addlink.gif" width="10" height="10" alt="Adicionar nova linha" title="Adicionar nova linha" style="margin:0.5em 1em;" />';
delete_link_html = '<img src="/admin-media/img/admin/icon_deletelink.gif" width="10" height="10" alt="Remover linha" title="Remover linha" style="margin-top:0.5em" />';
position_field = 'position';

jQuery(function($) {    
    // This script is applied to all TABULAR inlines
    $('div.inline-group div.tabular').each(function() {
        table = $(this).find('table');
                        
        // Hide initial extra row and prepare it to be used as a template for new rows
        add_template = table.find('tr:last');
        add_template.addClass('add_template').hide();
        table.prepend(add_template);
        
        // Hide initial deleted rows
        table.find('td.delete input:checkbox:checked').parent('td').parent('tr').addClass('deleted_row').hide();
        
        $(this).find('a.add').click(function(){
			tabular_box = $(this).parent().parent().parent();
			
            old_item = tabular_box.find('table tr.add_template');
            new_item = old_item.clone();

            create_delete_button(new_item.find('td.delete'));
            new_item.removeClass('add_template').show();
                        
            tabular_box.find('table').append(new_item);

            update_positions(tabular_box.find('table'), true);
            
			// Find the control that will get the focus
			new_item.find(':input:visible:enabled:first').focus();
			
            sync_widgets();
        }).removeAttr('href').css('cursor', 'pointer');
        
        // "Delete"-buttons for each row that replaces the default checkbox 
        table.find('tr:not(.add_template) td.delete').each(function() {
            create_delete_button($(this));
        });

        // Drag and drop functionality - only used if a position field exists
        if (position_field != '' && table.find('td').is('.' + position_field))
        {
            // Hide "position"-field (both td:s and th:s)
            $(this).find('td.' + position_field).hide();
            td_pos_field_index = table.find('tbody tr td').index($(this).find('td.' + position_field));
            $(this).find('th:eq(' + (td_pos_field_index-1) + ')').hide();
            
            // Hide "original"-field and set any colspan to 1 (why show in the first case?)
            $(this).find('td.original').hide();
            $(this).find('th[colspan]').removeAttr('colspan');

            // Make table sortable using jQuery UI Sortable
            table.sortable({
                items: 'tr:has(td)',
                tolerance: 'pointer',
                axis: 'y',
                cancel: 'input,button,select,a',
                helper: 'clone',
                update: function() {
                    update_positions($(this));
                }
            });
            
            // Re-order <tr>:s based on the "position"-field values.
            // This is a very simple ordering which only works with correct position number sequences,
            // which the rest of this script (hopefully) guarantees.
            rows = [];
            table.find('tbody tr').each(function() {
                position = $(this).find('td.' + position_field + ' input').val();
                rows[position] = $(this);
                
                // Add move cursor to table row.
                // Also remove row coloring, as it confuses when using drag-and-drop for ordering
                table.find('tr:has(td)').css('cursor', 'move').removeClass('row1').removeClass('row2');
            });
            
            for (var i in rows) { table.append(rows[i]); } // Move <tr> to its correct position
            update_positions($(this), true);
        }
        else
            position_field = '';
    });
});

// Function for creating fancy delete buttons
function create_delete_button(td)
{
     // Replace checkbox with image
    td.find('input:checkbox').hide();
    td.append('<a class="delete" href="#">' + delete_link_html + '</a>');
    
    td.find('a.delete').click(function(){
        current_row = $(this).parent('td').parent('tr');
        table = current_row.parent().parent();
        if (current_row.is('.has_original')) // This row has already been saved once, so we must keep checkbox
        {
            $(this).prev('input').attr('checked', true);
            current_row.addClass('deleted_row').hide();
        }
        else // This row has never been saved so we can just remove the element completely
        {
            current_row.remove();
        }
        
        update_positions(table, true);
    }).removeAttr('href').css('cursor', 'pointer');
}

// Updates "position"-field values based on row order in table
function update_positions(table, update_ids)
{
    even = true
    num_rows = 0
    position = 0;

    // Set correct position: Filter through all trs, excluding first th tr and last hidden template tr
    table.find('tbody tr:not(.add_template):not(.deleted_row)').each(function() {
        if (position_field != '')
        {
            // Update position field
            $(this).find('td.' + position_field + ' input').val(position + 1);
            position++;
        }
        else
        {
            // Update row coloring
            $(this).removeClass('row1 row2');
            if (even)
            {
                $(this).addClass('row1');
                even = false;
            }
            else
            {
                $(this).addClass('row2');
                even = true;
            }
        }
    });
    
    table.find('tbody tr.has_original').each(function() {
        num_rows++;
    });
    
    table.find('tbody tr:not(.has_original):not(.add_template)').each(function() {
        if (update_ids) update_id_fields($(this), num_rows);
        num_rows++;
    });    
    
    table.find('tbody tr.add_template').each(function() {
        if (update_ids) update_id_fields($(this), num_rows)
        num_rows++;
    });

    table.parent().parent('div.tabular').find("input[id$='TOTAL_FORMS']").val(num_rows);
}

// Updates actual id and name attributes of inputs, selects and so on.
// Required for Django validation to keep row order.
function update_id_fields(row, new_position)
{
    // Fix IDs, names etc.
    
    // <select ...>
    row.find('select').each(function() {
        // id=...
        old_id = $(this).attr('id').toString();
        new_id = old_id.replace(/([^ ]+\-)[0-9]+(\-[^ ]+)/i, "$1" + new_position + "$2");
        $(this).attr('id', new_id)
        
        // name=...
        old_id = $(this).attr('name').toString();
        new_id = old_id.replace(/([^ ]+\-)[0-9]+(\-[^ ]+)/i, "$1" + new_position + "$2");
        $(this).attr('name', new_id)
    });
    
    // <input ...>
    row.find('input').each(function() {
        // id=...
        old_id = $(this).attr('id').toString();
        new_id = old_id.replace(/([^ ]+\-)[0-9]+(\-[^ ]+)/i, "$1" + new_position + "$2");
        $(this).attr('id', new_id)
        
        // name=...
        old_id = $(this).attr('name').toString();
        new_id = old_id.replace(/([^ ]+\-)[0-9]+(\-[^ ]+)/i, "$1" + new_position + "$2");
        $(this).attr('name', new_id)
    });
    
    // <a ...>
    row.find('a').each(function() {
        // id=...
        old_id = $(this).attr('id').toString();
        new_id = old_id.replace(/([^ ]+\-)[0-9]+(\-[^ ]+)/i, "$1" + new_position + "$2");
        $(this).attr('id', new_id)
    });
    
    // Are there other element types...? Add here.
}
